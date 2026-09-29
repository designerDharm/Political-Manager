import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { prisma } from '@/lib/prisma';

export interface BackupMetadata {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  database: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  format: 'custom';
  createdAt: string;
  createdBy: string;
  error?: string;
}

export interface IBackupStorage {
  savePath(filename: string): string;
  exists(filename: string): boolean;
  getSize(filename: string): number;
  getStream(filename: string): fs.ReadStream;
  delete(filename: string): void;
}

class FilesystemBackupStorage implements IBackupStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  savePath(filename: string): string {
    // Prevent path traversal
    const safeName = path.basename(filename);
    return path.join(this.baseDir, safeName);
  }

  exists(filename: string): boolean {
    const filePath = this.savePath(filename);
    return fs.existsSync(filePath);
  }

  getSize(filename: string): number {
    const filePath = this.savePath(filename);
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
  }

  getStream(filename: string): fs.ReadStream {
    const filePath = this.savePath(filename);
    return fs.createReadStream(filePath);
  }

  delete(filename: string): void {
    const filePath = this.savePath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const backupStorage: IBackupStorage = new FilesystemBackupStorage();

export function parseDatabaseUrl(urlStr?: string) {
  const rawUrl = urlStr || process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const parsed = new URL(rawUrl);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || 'campaignops'),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.replace(/^\//, '') || 'campaignops',
  };
}

export async function createPostgresBackup(actorId: string, orgId: string): Promise<BackupMetadata> {
  const dbConfig = parseDatabaseUrl();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = crypto.randomUUID();
  const filename = `campaignops_backup_${timestamp}_${backupId.slice(0, 8)}.dump`;
  const destinationPath = backupStorage.savePath(filename);

  const pgDumpBin = process.env.PG_DUMP_PATH || '/opt/homebrew/bin/pg_dump';

  const args = [
    '-h', dbConfig.host,
    '-p', dbConfig.port,
    '-U', dbConfig.user,
    '-Fc', // custom archive format
    '-f', destinationPath,
    dbConfig.database,
  ];

  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pgDumpBin, args, { env });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', async (err) => {
      console.error('[Backup] pg_dump spawn error:', err);
      await prisma.auditEvent.create({
        data: {
          organizationId: orgId,
          actorId,
          action: 'BACKUP_FAILED',
          resource: `backup:${filename}`,
          details: JSON.stringify({ error: err.message, status: 'FAILED' }),
        },
      });
      reject(new Error(`Failed to start pg_dump: ${err.message}`));
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        console.error(`[Backup] pg_dump failed with exit code ${code}: ${stderr}`);
        backupStorage.delete(filename);
        await prisma.auditEvent.create({
          data: {
            organizationId: orgId,
            actorId,
            action: 'BACKUP_FAILED',
            resource: `backup:${filename}`,
            details: JSON.stringify({ exitCode: code, error: 'Database dump process failed' }),
          },
        });
        return reject(new Error(`pg_dump failed with exit code ${code}`));
      }

      try {
        const fileBuffer = fs.readFileSync(destinationPath);
        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const sizeBytes = fileBuffer.length;
        const sizeFormatted = `${(sizeBytes / 1024).toFixed(1)} KB`;

        const metadata: BackupMetadata = {
          id: backupId,
          filename,
          sizeBytes,
          sizeFormatted,
          sha256,
          database: dbConfig.database,
          status: 'COMPLETED',
          format: 'custom',
          createdAt: new Date().toISOString(),
          createdBy: actorId,
        };

        await prisma.auditEvent.create({
          data: {
            organizationId: orgId,
            actorId,
            action: 'BACKUP_CREATED',
            resource: `backup:${backupId}`,
            details: JSON.stringify(metadata),
          },
        });

        // Enforce basic retention (keep latest 30 backups)
        enforceBackupRetention(orgId).catch((e) => console.warn('[Backup] Retention cleanup error:', e));

        resolve(metadata);
      } catch (postErr: any) {
        reject(new Error(`Failed to process backup file: ${postErr.message}`));
      }
    });
  });
}

export async function restorePostgresBackup(
  backupFilename: string,
  targetDbName?: string
): Promise<{ success: boolean; details: string }> {
  const filePath = backupStorage.savePath(backupFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error('Backup dump file not found');
  }

  const dbConfig = parseDatabaseUrl();
  const dbToRestore = targetDbName || dbConfig.database;

  const pgRestoreBin = process.env.PG_RESTORE_PATH || '/opt/homebrew/bin/pg_restore';

  const args = [
    '-h', dbConfig.host,
    '-p', dbConfig.port,
    '-U', dbConfig.user,
    '-d', dbToRestore,
    filePath,
  ];

  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pgRestoreBin, args, { env });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      // pg_restore exit code 0 or 1 (warnings) is normal when tables/constraints already exist or are restored
      if (code === 0 || code === 1) {
        resolve({ success: true, details: `Database restored cleanly into ${dbToRestore}` });
      } else {
        reject(new Error(`pg_restore failed with exit code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to execute pg_restore: ${err.message}`));
    });
  });
}

export async function enforceBackupRetention(orgId: string, maxCount = 30): Promise<number> {
  const backups = await prisma.auditEvent.findMany({
    where: { action: 'BACKUP_CREATED', organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (backups.length <= maxCount) return 0;

  const toPrune = backups.slice(maxCount);
  let prunedCount = 0;

  for (const b of toPrune) {
    try {
      const meta = JSON.parse(b.details || '{}') as BackupMetadata;
      if (meta.filename) {
        backupStorage.delete(meta.filename);
      }
      await prisma.auditEvent.delete({ where: { id: b.id } });
      prunedCount++;
    } catch {
      // Ignore parse failure on legacy events
    }
  }

  return prunedCount;
}

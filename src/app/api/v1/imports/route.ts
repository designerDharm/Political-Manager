import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import { extractTextFromPdf } from '@/lib/ocr/provider';
import { parseElectoralRollPages, ParseRollResult } from '@/lib/ocr/electoralRollParser';
import { parseCsvRows, parseXlsxRows, parseTabularVoterRows } from '@/lib/ocr/tabularParser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// GET /api/v1/imports - List imports with campaign access verification
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID query param is required', 400);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const imports = await prisma.electoralRollImport.findMany({
      where: { campaignId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        pages: {
          select: {
            id: true,
            pageNumber: true,
            ocrStatus: true,
            confidence: true,
          },
        },
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    return apiSuccess(imports);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve imports', 500, String(err));
  }
}

// POST /api/v1/imports - Multipart file upload (PDF, CSV, XLSX), extraction, structured parsing & staging
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    // RBAC: Only Super Admin and Campaign Admin can upload and process imports
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not authorized to upload electoral rolls', 403);
    }

    const contentType = req.headers.get('content-type') || '';

    let campaignId = '';
    let wardId: string | null = null;
    let boothId: string | null = null;
    let fileBuffer: Buffer | null = null;
    let filename = '';
    let fileSizeStr = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      campaignId = (formData.get('campaignId') as string) || '';
      wardId = (formData.get('wardId') as string) || null;
      boothId = (formData.get('boothId') as string) || null;

      const file = formData.get('file') as File | null;
      if (!file) {
        return apiError('VALIDATION_ERROR', 'Please select a file to import. A valid file is required.', 400);
      }

      filename = file.name;
      fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload
      const body = await req.json().catch(() => ({}));
      campaignId = body.campaignId;
      wardId = body.wardId || null;
      boothId = body.boothId || null;
      filename = body.filename || '';
      fileSizeStr = body.fileSize || '';

      if (body.filePath && fs.existsSync(body.filePath)) {
        fileBuffer = fs.readFileSync(body.filePath);
      } else {
        return apiError('VALIDATION_ERROR', 'Please select a file to import. No file was provided.', 400);
      }
    }

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    // Security validations on uploaded file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      return apiError('VALIDATION_ERROR', 'Uploaded file buffer is empty', 400);
    }

    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return apiError('VALIDATION_ERROR', 'File size exceeds maximum permitted limit of 50 MB', 413);
    }

    // Detect file format from extension and magic bytes
    const lowerFilename = filename.toLowerCase();
    const isCsv = lowerFilename.endsWith('.csv');
    const isXlsx = lowerFilename.endsWith('.xlsx') || lowerFilename.endsWith('.xls');
    const isPdf = lowerFilename.endsWith('.pdf') || fileBuffer.subarray(0, 4).toString('ascii').startsWith('%PDF');

    if (!isPdf && !isCsv && !isXlsx) {
      return apiError('VALIDATION_ERROR', 'Invalid file type: Supported formats are PDF (.pdf), CSV (.csv), and Excel (.xlsx, .xls)', 415);
    }

    // PDF Magic Bytes Validation: Apply %PDF check strictly to PDF files only
    if (isPdf) {
      const magicBytes = fileBuffer.subarray(0, 4).toString('ascii');
      if (!magicBytes.startsWith('%PDF')) {
        return apiError('VALIDATION_ERROR', 'Invalid file type: File must be a valid PDF document with %PDF header', 415);
      }
    }

    // Ensure uploads directory exists (using /tmp on serverless environments like Vercel)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const uploadsDir = isServerless
      ? path.join('/tmp', 'uploads', 'imports')
      : path.join(process.cwd(), 'uploads', 'imports');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationPath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(destinationPath, fileBuffer);

    // Fetch existing EPIC numbers in database to detect duplicate voters
    const existingVoters = await prisma.voter.findMany({
      where: { campaignId },
      select: { epicNumber: true },
    });
    const existingEpicSet = new Set<string>(existingVoters.map((v) => v.epicNumber));

    let parseResult: ParseRollResult;
    let pagesToCreate: { pageNumber: number; ocrStatus: string; confidence: number; rawText: string }[] = [];
    let initialStatus = 'ReadyToPublish';

    if (isCsv) {
      // 1A. CSV Parsing
      const csvContent = fileBuffer.toString('utf8');
      const rows = parseCsvRows(csvContent);
      const tabularResult = parseTabularVoterRows(rows, existingEpicSet);

      if (!tabularResult.success || !tabularResult.parseResult) {
        return apiError('VALIDATION_ERROR', tabularResult.error || 'Failed to parse CSV electoral roll records.', 400);
      }

      parseResult = tabularResult.parseResult;
      pagesToCreate = [
        {
          pageNumber: 1,
          ocrStatus: 'Completed',
          confidence: 1.0,
          rawText: `CSV Import: ${rows.length} rows processed`,
        },
      ];
    } else if (isXlsx) {
      // 1B. XLSX Parsing
      let rows: string[][];
      try {
        rows = parseXlsxRows(fileBuffer);
      } catch (err: any) {
        return apiError('VALIDATION_ERROR', `Failed to read XLSX file: ${err.message || 'Corrupted or unsupported format'}`, 400);
      }

      const tabularResult = parseTabularVoterRows(rows, existingEpicSet);
      if (!tabularResult.success || !tabularResult.parseResult) {
        return apiError('VALIDATION_ERROR', tabularResult.error || 'Failed to parse XLSX electoral roll records.', 400);
      }

      parseResult = tabularResult.parseResult;
      pagesToCreate = [
        {
          pageNumber: 1,
          ocrStatus: 'Completed',
          confidence: 1.0,
          rawText: `XLSX Import: ${rows.length} rows processed`,
        },
      ];
    } else {
      // 1C. PDF Parsing & OCR
      const ocrResult = await extractTextFromPdf(destinationPath);
      parseResult = parseElectoralRollPages(ocrResult.pages, existingEpicSet);

      const totalChars = ocrResult.pages.reduce((acc, p) => acc + p.text.trim().length, 0);
      if (parseResult.totalExtracted === 0 || totalChars < 50) {
        initialStatus = 'ScannedPdfOcrRequired';
      }

      pagesToCreate = ocrResult.pages.map((p) => ({
        pageNumber: p.pageNumber,
        ocrStatus: 'Completed',
        confidence: p.confidence,
        rawText: p.text.slice(0, 10000),
      }));
    }

    // Determine initial status for review center
    if (initialStatus !== 'ScannedPdfOcrRequired') {
      if (parseResult.lowConfidenceCount > 0) {
        initialStatus = 'LowConfidenceReview';
      } else if (parseResult.duplicateCount > 0) {
        initialStatus = 'DuplicateReview';
      }
    }

    // Transactionally create ElectoralRollImport, ImportPages, and staged ImportRecords
    const importJob = await prisma.$transaction(async (tx) => {
      const job = await tx.electoralRollImport.create({
        data: {
          campaignId: campaign.id,
          wardId,
          boothId,
          originalFilename: filename,
          fileSize: fileSizeStr,
          filePath: destinationPath,
          fileSha256,
          status: initialStatus,
          totalExtracted: parseResult.totalExtracted,
          totalHouseholds: 0,
          confidenceAvg: parseResult.confidenceAvg,
          lowConfidenceCount: parseResult.lowConfidenceCount,
          duplicateCount: parseResult.duplicateCount,
          pages: {
            create: pagesToCreate,
          },
        },
      });

      // Insert staged records
      if (parseResult.voters.length > 0) {
        await tx.importRecord.createMany({
          data: parseResult.voters.map((v) => ({
            importId: job.id,
            campaignId: campaign.id,
            wardId,
            boothId,
            serialNumber: v.serialNumber,
            epicNumber: v.epicNumber,
            fullName: v.fullName,
            relationName: v.relationName || null,
            relationType: v.relationType,
            houseNumber: v.houseNumber,
            age: v.age,
            gender: v.gender,
            status: v.status,
            confidence: v.confidence,
            fieldConfidences: JSON.stringify(v.fieldConfidences),
            sourceSnippet: v.sourceSnippet,
            sourcePage: v.sourcePage,
            validationErrors: v.validationErrors.length > 0 ? JSON.stringify(v.validationErrors) : null,
          })),
        });
      }

      // Record audit event
      await tx.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          actorId: authResult.principal.userId,
          action: 'ELECTORAL_ROLL_UPLOADED',
          resource: `ElectoralRollImport:${job.id}`,
          details: JSON.stringify({
            campaignId: campaign.id,
            originalFilename: filename,
            format: isCsv ? 'CSV' : isXlsx ? 'XLSX' : 'PDF',
            totalExtracted: parseResult.totalExtracted,
            confidenceAvg: parseResult.confidenceAvg,
            lowConfidenceCount: parseResult.lowConfidenceCount,
            duplicateCount: parseResult.duplicateCount,
          }),
        },
      });

      return job;
    });

    return apiSuccess(
      {
        ...importJob,
        extractedVotersCount: parseResult.totalExtracted,
      },
      { created: true },
      201
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to process electoral roll import', 500, String(err));
  }
}

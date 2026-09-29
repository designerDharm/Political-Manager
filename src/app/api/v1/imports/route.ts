import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import { extractTextFromPdf } from '@/lib/ocr/provider';
import { parseElectoralRollPages } from '@/lib/ocr/electoralRollParser';
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

// POST /api/v1/imports - Multipart PDF upload, OCR text extraction, structured parsing & staging
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
        return apiError('VALIDATION_ERROR', 'PDF file is required in multipart form', 400);
      }

      filename = file.name;
      fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload fallback
      const body = await req.json();
      campaignId = body.campaignId;
      wardId = body.wardId || null;
      boothId = body.boothId || null;
      filename = body.filename || 'Ward_Electoral_Roll.pdf';
      fileSizeStr = body.fileSize || '1.0 MB';

      // If sample or existing path provided
      if (body.filePath && fs.existsSync(body.filePath)) {
        fileBuffer = fs.readFileSync(body.filePath);
      } else {
        // Fallback to sample electoral roll if available
        const defaultPdf = path.join(process.cwd(), 'UI:UX screens/KITHANA-Ward No-001.pdf');
        if (fs.existsSync(defaultPdf)) {
          fileBuffer = fs.readFileSync(defaultPdf);
          filename = 'KITHANA-Ward No-001.pdf';
          fileSizeStr = `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          return apiError('VALIDATION_ERROR', 'File buffer could not be resolved', 400);
        }
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

    const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
    if (fileBuffer.length > MAX_PDF_SIZE_BYTES) {
      return apiError('VALIDATION_ERROR', 'File size exceeds maximum permitted limit of 50 MB', 413);
    }

    // PDF Magic Bytes Validation: first 4 bytes must be "%PDF"
    const magicBytes = fileBuffer.subarray(0, 4).toString('ascii');
    if (!magicBytes.startsWith('%PDF')) {
      return apiError('VALIDATION_ERROR', 'Invalid file type: File must be a valid PDF document with %PDF header', 415);
    }

    // Ensure uploads directory exists (outside public root)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationPath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(destinationPath, fileBuffer);

    // 1. Run real text extraction via OCR / Poppler engine
    const ocrResult = await extractTextFromPdf(destinationPath);

    // 2. Fetch existing EPIC numbers in database to detect duplicate voters
    const existingVoters = await prisma.voter.findMany({
      where: { campaignId },
      select: { epicNumber: true },
    });
    const existingEpicSet = new Set<string>(existingVoters.map((v) => v.epicNumber));

    // 3. Run structured parsing of electoral roll pages
    const parseResult = parseElectoralRollPages(ocrResult.pages, existingEpicSet);

    // 4. Determine pipeline status based on extraction results
    let initialStatus = 'ReadyToPublish';
    const totalChars = ocrResult.pages.reduce((acc, p) => acc + p.text.trim().length, 0);

    if (parseResult.totalExtracted === 0 || totalChars < 50) {
      initialStatus = 'ScannedPdfOcrRequired';
    } else if (parseResult.lowConfidenceCount > 0) {
      initialStatus = 'LowConfidenceReview';
    } else if (parseResult.duplicateCount > 0) {
      initialStatus = 'DuplicateReview';
    }

    // 5. Transactionally create ElectoralRollImport, ImportPages, and staged ImportRecords
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
            create: ocrResult.pages.map((p) => ({
              pageNumber: p.pageNumber,
              ocrStatus: 'Completed',
              confidence: p.confidence,
              rawText: p.text.slice(0, 10000), // preserve raw text snippet
            })),
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

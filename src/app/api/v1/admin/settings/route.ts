import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const settingRecord = await prisma.auditEvent.findFirst({
      where: { action: 'UPDATE_GLOBAL_SETTINGS' },
      orderBy: { createdAt: 'desc' },
    });

    const defaultSettings = {
      apiBaseEndpoint: 'https://api.campaignops.internal/v1',
      maxUploadSize: '250 MB',
      auditRetention: '7 Years (Statutory Election Standard)',
      strictNonInference: true,
      breakGlassDualControl: true,
    };

    let current = defaultSettings;
    if (settingRecord?.details) {
      try {
        current = JSON.parse(settingRecord.details);
      } catch (e) {
        current = defaultSettings;
      }
    }

    return apiSuccess(current);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve settings', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiBaseEndpoint, maxUploadSize, auditRetention, strictNonInference, breakGlassDualControl } = body;

    const payload = {
      apiBaseEndpoint: apiBaseEndpoint || 'https://api.campaignops.internal/v1',
      maxUploadSize: maxUploadSize || '250 MB',
      auditRetention: auditRetention || '7 Years (Statutory Election Standard)',
      strictNonInference: strictNonInference !== undefined ? strictNonInference : true,
      breakGlassDualControl: breakGlassDualControl !== undefined ? breakGlassDualControl : true,
      updatedAt: new Date().toISOString(),
    };

    const org = await prisma.organization.findFirst();
    const orgId = org?.id || 'default-org';

    await prisma.auditEvent.create({
      data: {
        organizationId: orgId,
        action: 'UPDATE_GLOBAL_SETTINGS',
        resource: 'system:settings',
        details: JSON.stringify(payload),
      },
    });

    return apiSuccess(payload, { message: 'Platform settings saved successfully' }, 200);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to update settings', 500, String(err));
  }
}

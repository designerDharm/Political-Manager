import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminSettingsClient from '@/components/super-admin/SuperAdminSettingsClient';

export const revalidate = 0;

export default async function SuperAdminSettingsPage() {
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

  let initialSettings = defaultSettings;
  if (settingRecord?.details) {
    try {
      initialSettings = JSON.parse(settingRecord.details);
    } catch (e) {
      initialSettings = defaultSettings;
    }
  }

  return <SuperAdminSettingsClient initialSettings={initialSettings} />;
}

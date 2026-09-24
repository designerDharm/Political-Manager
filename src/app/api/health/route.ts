import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orgCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    const campaignCount = await prisma.campaign.count();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      metrics: {
        organizations: orgCount,
        users: userCount,
        campaigns: campaignCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: String(error),
      },
      { status: 500 }
    );
  }
}

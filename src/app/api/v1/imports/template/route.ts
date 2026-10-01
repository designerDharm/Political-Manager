import { NextRequest, NextResponse } from 'next/server';
import { getSampleCsvTemplate } from '@/lib/ocr/tabularParser';

// GET /api/v1/imports/template - Download voter roll import CSV template
export async function GET(req: NextRequest) {
  const csvContent = getSampleCsvTemplate();

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="voter_roll_template.csv"',
      'Cache-Control': 'no-cache',
    },
  });
}

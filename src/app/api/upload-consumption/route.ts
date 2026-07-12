import { NextRequest, NextResponse } from 'next/server';
import { processMedicalConsumptionFile } from '@/lib/medical-analytics/ingestion-service';
import { runAllAnalyticsEngines } from '@/lib/medical-analytics/calculation-engine';
import { runFWAEngine } from '@/lib/medical-analytics/fwa-engine';
import { runMemberRiskEngine } from '@/lib/medical-analytics/risk-engine';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const policyId = formData.get('policyId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!policyId) {
      return NextResponse.json({ error: 'Missing policyId' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Ingestion
    const result = await processMedicalConsumptionFile(buffer, policyId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 2. Trigger Backend Pipelines (Awaited for immediate feedback, though usually queued)
    await runAllAnalyticsEngines(policyId);
    await runFWAEngine(policyId);
    await runMemberRiskEngine(policyId);

    return NextResponse.json({ 
      success: true, 
      message: 'Ingestion & Analytics completed successfully', 
      processedRows: result.processed 
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { proxyReportDownload } from '@/lib/reports-proxy';

export async function GET(req: NextRequest) {
  return proxyReportDownload(req, '/reports/missions');
}

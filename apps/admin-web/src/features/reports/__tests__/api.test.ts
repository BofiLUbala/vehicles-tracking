import { describe, expect, it } from 'vitest';
import { buildReportDownloadUrl } from '@/features/reports/api';

describe('buildReportDownloadUrl', () => {
  it('builds a missions download URL with the format and no filters', () => {
    expect(buildReportDownloadUrl('missions', {}, 'csv')).toBe('/api/reports/missions?format=csv');
  });

  it('includes active mission filters as query params', () => {
    const url = buildReportDownloadUrl(
      'missions',
      { from: '2026-01-01', to: '2026-01-31', vehicleId: 'v1', driverId: 'd1', status: 'COMPLETED', locationId: 'l1' },
      'xlsx',
    );
    const parsed = new URL(url, 'http://example.test');
    expect(parsed.pathname).toBe('/api/reports/missions');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      vehicleId: 'v1',
      driverId: 'd1',
      status: 'COMPLETED',
      locationId: 'l1',
      format: 'xlsx',
    });
  });

  it('omits undefined filters from the URL', () => {
    const url = buildReportDownloadUrl('missions', { vehicleId: 'v1' }, 'pdf');
    expect(url).toBe('/api/reports/missions?vehicleId=v1&format=pdf');
  });

  it('builds a fuel download URL with only the fuel-relevant filters', () => {
    const url = buildReportDownloadUrl('fuel', { from: '2026-02-01', vehicleId: 'v9' }, 'csv');
    expect(url).toBe('/api/reports/fuel?from=2026-02-01&vehicleId=v9&format=csv');
  });
});

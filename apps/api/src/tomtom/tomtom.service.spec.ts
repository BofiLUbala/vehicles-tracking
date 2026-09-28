import { ConfigService } from '@nestjs/config';
import { TomTomService } from './tomtom.service';
import { TomTomError } from './tomtom.types';

const KEY = 'secret-test-key-123';
const A = { latitude: -4.32, longitude: 15.31 };
const B = { latitude: -4.33, longitude: 15.32 };

function makeService(env: Record<string, string | undefined> = { TOMTOM_API_KEY: KEY, TOMTOM_TIMEOUT_MS: '200' }) {
  return new TomTomService({ get: (k: string) => env[k] } as unknown as ConfigService);
}

function jsonResponse(status: number, body: unknown = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

const routeBody = {
  routes: [
    {
      summary: { lengthInMeters: 1500, travelTimeInSeconds: 300, trafficDelayInSeconds: 20 },
      legs: [{ points: [{ latitude: -4.32, longitude: 15.31 }, { latitude: -4.325, longitude: 15.315 }] }],
    },
  ],
};

describe('TomTomService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  it('refuses without an API key and makes no network call', async () => {
    await expect(makeService({}).calculateRoute([A, B])).rejects.toMatchObject({ kind: 'NOT_CONFIGURED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid coordinates without calling TomTom', async () => {
    await expect(makeService().calculateRoute([A, { latitude: 200, longitude: 0 }])).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    await expect(makeService().calculateRoute([A])).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses a route and caches it (single upstream call)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, routeBody));
    const svc = makeService();
    const r1 = await svc.calculateRoute([A, B]);
    const r2 = await svc.calculateRoute([A, B]);
    expect(r1.points).toHaveLength(2);
    expect(r1.lengthInMeters).toBe(1500);
    expect(r2).toBe(r1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/routing/1/calculateRoute/-4.32,15.31:-4.33,15.32/json');
  });

  it('retries transient 5xx then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503)).mockResolvedValueOnce(jsonResponse(200, routeBody));
    const r = await makeService().calculateRoute([A, B]);
    expect(r.points).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after bounded retries on persistent 5xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));
    await expect(makeService().calculateRoute([A, B])).rejects.toMatchObject({ kind: 'UPSTREAM' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    [400, 'INVALID_INPUT'],
    [401, 'AUTH'],
    [403, 'AUTH'],
    [429, 'RATE_LIMITED'],
  ])('does not retry %i', async (status, kind) => {
    fetchMock.mockResolvedValue(jsonResponse(status));
    await expect(makeService().calculateRoute([A, B])).rejects.toMatchObject({ kind });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times out and retries a bounded number of times', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })))),
    );
    await expect(makeService({ TOMTOM_API_KEY: KEY, TOMTOM_TIMEOUT_MS: '20' }).calculateRoute([A, B])).rejects.toMatchObject({ kind: 'TIMEOUT' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('flags malformed responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { routes: [] }));
    await expect(makeService().calculateRoute([A, B])).rejects.toMatchObject({ kind: 'MALFORMED' });
  });

  it('never leaks the API key in errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403));
    const err = (await makeService().calculateRoute([A, B]).catch((e) => e)) as TomTomError;
    expect(JSON.stringify({ m: err.message, s: err.stack?.split('\n')[0] })).not.toContain(KEY);
  });

  it('snaps to roads with one POST batch, GeoJSON [lng,lat] -> {latitude,longitude}', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        projectedPoints: [
          { geometry: { coordinates: [15.311, -4.321] }, properties: { snapResult: 'Matched' } },
          { geometry: { coordinates: [15.321, -4.331] }, properties: { snapResult: 'OffRoad' } },
        ],
      }),
    );
    const snapped = await makeService().snapToRoads([A, B], 'm1:1');
    expect(snapped.points[0]).toEqual({ latitude: -4.321, longitude: 15.311 });
    expect(snapped.offRoadPoints).toBe(1);
    expect(snapped.inputPoints).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/snapToRoads/1');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).points[0].geometry.coordinates).toEqual([15.31, -4.32]);
  });

  // Forme reellement renvoyee par TomTom (verifiee en conditions reelles le 21/09/2026) :
  // un point non recale porte `geometry: null` — cas normal avec une trace GPS bruitee.
  it('treats unsnappable points (geometry: null) as off-road instead of failing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        projectedPoints: [
          { geometry: { coordinates: [15.3219812446, -4.3248757252] }, properties: { snapResult: 'Matched' } },
          { geometry: null, properties: { snapResult: 'MaxDistanceExceeded' } },
          { geometry: null, properties: { snapResult: 'OffRoad' } },
        ],
      }),
    );
    const snapped = await makeService().snapToRoads([A, B, A]);
    expect(snapped.points).toEqual([{ latitude: -4.3248757252, longitude: 15.3219812446 }]);
    expect(snapped.offRoadPoints).toBe(2);
    expect(snapped.inputPoints).toBe(3);
  });

  it('still rejects a malformed geometry (coordinates present but invalid)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { projectedPoints: [{ geometry: { coordinates: ['x', 1] } }] }));
    await expect(makeService().snapToRoads([A, B])).rejects.toMatchObject({ kind: 'MALFORMED' });
  });

  it('snap rejects too many points before any call', async () => {
    const many = Array.from({ length: 5001 }, () => A);
    await expect(makeService().snapToRoads(many)).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reverse geocodes once per ~11 m cell and returns a readable address', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        addresses: [{ address: { streetNumber: '12', streetName: 'Avenue du Commerce', municipality: 'Kinshasa', freeformAddress: '12 Avenue du Commerce, Kinshasa' } }],
      }),
    );
    const svc = makeService();
    const r = await svc.reverseGeocode(A);
    expect(r).toEqual({ address: '12 Avenue du Commerce, Kinshasa', street: '12 Avenue du Commerce', municipality: 'Kinshasa' });
    await svc.reverseGeocode({ latitude: A.latitude + 0.00001, longitude: A.longitude });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/search/2/reverseGeocode/-4.3200,15.3100.json');
  });

  it('reverse geocode returns nulls when TomTom knows no address', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { addresses: [] }));
    expect(await makeService().reverseGeocode(B)).toEqual({ address: null, street: null, municipality: null });
  });
});

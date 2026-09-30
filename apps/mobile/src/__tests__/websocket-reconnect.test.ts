/* eslint-disable import/first -- vi.mock() must textually precede imports (Vitest hoists them) */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Handler = (...args: any[]) => void;

class FakeSocket {
  connected = false;
  handlers = new Map<string, Handler[]>();
  connect = vi.fn();
  disconnect = vi.fn();
  emit = vi.fn();
  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  off = vi.fn();
  fire(event: string, ...args: any[]) {
    (this.handlers.get(event) ?? []).forEach((h) => h(...args));
  }
}

const created: { socket: FakeSocket; options: any }[] = [];

vi.mock('socket.io-client', () => ({
  io: vi.fn((_url: string, options: any) => {
    const socket = new FakeSocket();
    created.push({ socket, options });
    return socket;
  }),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (): Promise<string | null> => null),
  setItemAsync: vi.fn(async (): Promise<void> => undefined),
  deleteItemAsync: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('expo-modules-core', () => ({
  requireNativeModule: vi.fn((): Record<string, unknown> => ({})),
  requireOptionalNativeModule: vi.fn((): null => null),
  NativeModulesProxy: {},
}));

import { WebSocketService } from '../services/websocket.service';
import { AuthService } from '../services/auth.service';
import { AuthApi } from '../api/auth.api';

describe('WebSocketService — temps réel durable', () => {
  let token = 'token-1';

  beforeEach(() => {
    created.length = 0;
    token = 'token-1';
    vi.spyOn(AuthService, 'getAccessToken').mockImplementation(async () => token);
    WebSocketService.disconnect();
  });

  afterEach(() => {
    WebSocketService.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rattache un écouteur enregistré AVANT la création de la socket (mission.assigned)", async () => {
    const onAssigned = vi.fn();
    const off = WebSocketService.on('mission.assigned', onAssigned);
    await WebSocketService.connect();

    created[0].socket.fire('mission.assigned', { missionId: 'm1' });
    expect(onAssigned).toHaveBeenCalledWith({ missionId: 'm1' });
    off();
  });

  it('relit le jeton à chaque tentative et ne cesse jamais de se reconnecter', async () => {
    await WebSocketService.connect();
    const { options } = created[0];
    expect(options.reconnectionAttempts).toBe(Infinity);

    const first = await new Promise((resolve) => options.auth(resolve));
    token = 'token-2';
    const second = await new Promise((resolve) => options.auth(resolve));
    expect(first).toEqual({ token: 'token-1' });
    expect(second).toEqual({ token: 'token-2' });
  });

  it('renouvelle la session puis se reconnecte après un refus serveur (jeton expiré)', async () => {
    vi.useFakeTimers();
    const profile = vi.spyOn(AuthApi, 'getProfile').mockResolvedValue({} as any);
    await WebSocketService.connect();
    const { socket } = created[0];

    socket.fire('disconnect', 'io server disconnect');
    await vi.runAllTimersAsync();

    expect(profile).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("ne relance rien après une déconnexion volontaire (logout)", async () => {
    vi.useFakeTimers();
    const profile = vi.spyOn(AuthApi, 'getProfile').mockResolvedValue({} as any);
    await WebSocketService.connect();
    const { socket } = created[0];

    socket.fire('disconnect', 'io server disconnect');
    WebSocketService.disconnect();
    await vi.runAllTimersAsync();

    expect(profile).not.toHaveBeenCalled();
    expect(socket.connect).not.toHaveBeenCalled();
  });
});

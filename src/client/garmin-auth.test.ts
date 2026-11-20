import fs from 'node:fs';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GarminAuth, GarminReconnectRequired, RECONNECT_MARKER } from './garmin-auth';

vi.mock('axios', async (original) => {
  const actual = await original<typeof import('axios')>();
  return {
    default: Object.assign(vi.fn(), {
      get: vi.fn(),
      post: vi.fn(),
      create: vi.fn(),
      isAxiosError: actual.default.isAxiosError,
    }),
  };
});

const http = axios as unknown as ReturnType<typeof vi.fn> & { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
const TOKEN = JSON.stringify({ oauth_token: 'a', oauth_token_secret: 'b' });

function refused(status: number): Error {
  return Object.assign(new Error('refused'), { isAxiosError: true, response: { status } });
}

function garminWorks(): void {
  http.get.mockImplementation(async (url: string) =>
    url.includes('oauth_consumer')
      ? { data: { consumer_key: 'k', consumer_secret: 's' } }
      : { data: { displayName: 'someone', profileId: 1 } },
  );
  http.post.mockResolvedValue({ data: { access_token: 'x', expires_in: 3600, refresh_token_expires_in: 7200 } });
  http.mockResolvedValue({ data: { ok: true } });
}

describe('token mode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('uses the token it was given and touches no files', async () => {
    garminWorks();
    const write = vi.spyOn(fs, 'writeFileSync');
    const read = vi.spyOn(fs, 'readFileSync');
    const auth = new GarminAuth('', '', undefined, { mode: 'token', token: TOKEN });
    await expect(auth.request('/anything')).resolves.toEqual({ ok: true });
    expect(write).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it('asks for a new sign-in when Garmin refuses the token', async () => {
    garminWorks();
    http.post.mockRejectedValue(refused(401));
    const auth = new GarminAuth('', '', undefined, { mode: 'token', token: TOKEN });
    await expect(auth.request('/anything')).rejects.toBeInstanceOf(GarminReconnectRequired);
  });

  it('asks for a new sign-in when a later refresh fails', async () => {
    garminWorks();
    http.mockRejectedValueOnce(refused(401));
    http.post.mockResolvedValueOnce({ data: { access_token: 'x', expires_in: 3600, refresh_token_expires_in: 7200 } });
    http.post.mockRejectedValueOnce(refused(401));
    const auth = new GarminAuth('', '', undefined, { mode: 'token', token: TOKEN });
    await expect(auth.request('/anything')).rejects.toBeInstanceOf(GarminReconnectRequired);
  });

  it('asks for a new sign-in when the token is unreadable, without trying a password', async () => {
    garminWorks();
    const auth = new GarminAuth('', '', undefined, { mode: 'token', token: 'not json' });
    await expect(auth.request('/anything')).rejects.toThrow(RECONNECT_MARKER);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('does not call a network failure an expired sign-in', async () => {
    garminWorks();
    http.post.mockRejectedValue(refused(500));
    const auth = new GarminAuth('', '', undefined, { mode: 'token', token: TOKEN });
    await expect(auth.request('/anything')).rejects.not.toBeInstanceOf(GarminReconnectRequired);
  });
});

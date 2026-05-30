import { Torrent } from '@/types';

const QB_URL  = process.env.QB_URL  ?? 'http://localhost:8078';
const QB_USER = process.env.QB_USER ?? 'admin';
const QB_PASS = process.env.QB_PASS ?? 'adminadmin';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

let sid: string | null = null;
let sidExpiry = 0;

async function login(): Promise<string> {
  const body = new URLSearchParams({ username: QB_USER, password: QB_PASS });
  const res = await fetch(`${QB_URL}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`QB login failed: ${res.status}`);

  // Extract SID from Set-Cookie header
  const cookie = res.headers.get('set-cookie') ?? '';
  const match = cookie.match(/SID=([^;]+)/);
  if (!match) throw new Error('QB login: SID cookie not found');

  return match[1];
}

async function getSid(): Promise<string> {
  if (sid && Date.now() < sidExpiry) return sid;
  sid = await login();
  sidExpiry = Date.now() + SESSION_TTL_MS;
  return sid;
}

export async function getTorrents(): Promise<Torrent[]> {
  let token = await getSid();

  const doFetch = (s: string) =>
    fetch(`${QB_URL}/api/v2/torrents/info`, {
      headers: { Cookie: `SID=${s}` },
    });

  let res = await doFetch(token);

  // Re-login once on 403
  if (res.status === 403) {
    sid = null;
    token = await getSid();
    res = await doFetch(token);
  }

  if (!res.ok) throw new Error(`QB torrents/info failed: ${res.status}`);
  return res.json() as Promise<Torrent[]>;
}

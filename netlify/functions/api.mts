import type { Config } from '@netlify/functions';
import platformKey from '../../api/platform-key';
import sign from '../../api/sign';
import sms from '../../api/sms';
import voice from '../../api/voice';

/**
 * Netlify adapter: runs the same /api/* handlers as Vercel (VercelRequest/VercelResponse
 * shape) behind one Netlify Function.
 */
type Handler = (req: unknown, res: unknown) => unknown;
const routes: Record<string, Handler> = { 'platform-key': platformKey, sign, sms, voice } as Record<string, Handler>;

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const handler = routes[name];
  if (!handler) return new Response('Not found', { status: 404 });
  const raw = request.method === 'GET' ? '' : await request.text();
  const ct = request.headers.get('content-type') ?? '';
  const body = !raw ? undefined : ct.includes('json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  let status = 200;
  const outHeaders = new Headers();
  let payload = '';
  const res = {
    status(code: number) { status = code; return res; },
    setHeader(k: string, v: string) { outHeaders.set(k, v); return res; },
    json(v: unknown) { outHeaders.set('content-type', 'application/json'); payload = JSON.stringify(v); return res; },
    send(v: string) { payload = v; return res; },
    end(v?: string) { if (v) payload = v; return res; },
  };
  await handler({ method: request.method, url: url.pathname + url.search, headers, body, query: Object.fromEntries(url.searchParams) }, res);
  return new Response(payload, { status, headers: outHeaders });
};

export const config: Config = { path: '/api/*' };

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Serves /api/* serverless functions during `vite dev` and `vite preview` (same code as on Vercel). */
function apiDev(): Plugin {
  const mount = (load: (path: string) => Promise<Record<string, unknown>>) =>
    async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const name = url.pathname.replace(/^\/api\//, '').replace(/[^a-z-]/g, '');
      if (!url.pathname.startsWith('/api/') || name.startsWith('_')) return next();
      let mod: Record<string, unknown>;
      try { mod = await load(`/api/${name}.ts`); } catch { return next(); }
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const ct = req.headers['content-type'] ?? '';
      const body = !raw ? undefined : ct.includes('json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
      const vres = Object.assign(res, {
        status(code: number) { res.statusCode = code; return vres; },
        json(v: unknown) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(v)); return vres; },
        send(v: string) { res.end(v); return vres; },
      });
      await (mod.default as (q: unknown, r: unknown) => unknown)(Object.assign(req, { body, query: Object.fromEntries(url.searchParams) }), vres);
    };
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(mount((p) => server.ssrLoadModule(p)));
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDev()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          ai: ['@anthropic-ai/sdk', 'openai'],
          pdf: ['pdf-lib', 'qrcode', 'jsqr'],
        },
      },
    },
  },
  test: { environment: 'node' },
} as never);

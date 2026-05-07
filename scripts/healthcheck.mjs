#!/usr/bin/env node
/**
 * scripts/healthcheck.mjs
 *
 * Pingea cada servicio definido en src/config.ts y appends al JSON de
 * history/YYYY-MM.json. Diseñado para correr cada 5 min via GitHub Actions cron.
 *
 * No depende de Astro — corre con plain Node 22+ con fetch global.
 *
 * Output: stdout con resumen + side effect en history/.
 * Exit code 0 siempre (no rompe el cron por servicios temporalmente caídos —
 * eso es lo que el dashboard refleja).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = path.resolve(__dirname, '../history');
fs.mkdirSync(HISTORY_DIR, { recursive: true });

// Sincronizada con src/config.ts (pero sin import — este script corre standalone)
const SERVICES = [
  { id: 'app', label: 'App web', url: 'https://app.orkenta-ia.com/app/', method: 'GET', timeoutMs: 8000 },
  { id: 'api', label: 'API REST', url: 'https://app.orkenta-ia.com/api/system/auth/me', method: 'GET', timeoutMs: 8000 },
  { id: 'download', label: 'Mobile downloads', url: 'https://download.orkenta-ia.com/mobile/orkenta-android-v1.0.0.apk', method: 'HEAD', timeoutMs: 8000 },
  { id: 'marketing', label: 'Marketing landing', url: 'https://orkenta-ia.com/', method: 'GET', timeoutMs: 8000 },
];

async function checkOne(svc) {
  const ts = new Date().toISOString();
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), svc.timeoutMs);
    const res = await fetch(svc.url, {
      method: svc.method,
      signal: ctrl.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'orkenta-status-page/1.0' },
    });
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    // 200/204/302/301 todos son OK (la app SPA hace redirect a /app/, api responde 401 sin auth pero el handshake funciona)
    const ok = (res.status >= 200 && res.status < 400) || res.status === 401;
    return { ts, statusCode: res.status, latencyMs, ok };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { ts, statusCode: 0, latencyMs, ok: false, error: String(err?.message ?? err) };
  }
}

function appendHistory(svcId, entry) {
  const yyyymm = entry.ts.slice(0, 7);
  const file = path.join(HISTORY_DIR, `${yyyymm}.json`);
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
  }
  if (!data[svcId]) data[svcId] = [];
  data[svcId].push(entry);
  // Cap a 9000 entries por servicio por mes (5 min × 24h × 31d ≈ 8928)
  if (data[svcId].length > 9000) data[svcId] = data[svcId].slice(-9000);
  fs.writeFileSync(file, JSON.stringify(data, null, 0));
}

(async () => {
  console.log(`[healthcheck] ${new Date().toISOString()} — running ${SERVICES.length} checks`);
  for (const svc of SERVICES) {
    const result = await checkOne(svc);
    appendHistory(svc.id, result);
    const flag = result.ok ? 'OK ' : 'FAIL';
    console.log(`  ${flag} ${svc.id.padEnd(12)} ${String(result.statusCode).padStart(3)} ${result.latencyMs}ms ${result.error ?? ''}`);
  }
  console.log('[healthcheck] done');
})();

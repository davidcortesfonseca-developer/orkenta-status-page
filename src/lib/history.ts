/**
 * Lectura de history JSON files generados por el cron healthcheck.
 *
 * Estructura:
 *   history/YYYY-MM.json  →  { service_id: [ { ts, statusCode, latencyMs, ok } ] }
 *
 * Las entries se acumulan por mes; al rotar de mes el cron crea archivo nuevo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = path.resolve(__dirname, '../../history');

export interface HealthCheckEntry {
  ts: string; // ISO timestamp
  statusCode: number;
  latencyMs: number;
  ok: boolean;
}

export type ServiceHistory = Record<string, HealthCheckEntry[]>;

export function loadHistoryForMonth(yyyymm: string): ServiceHistory {
  const file = path.join(HISTORY_DIR, `${yyyymm}.json`);
  if (!fs.existsSync(file)) return {};
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as ServiceHistory;
  } catch {
    return {};
  }
}

export function loadLast90Days(): ServiceHistory {
  const now = new Date();
  const merged: ServiceHistory = {};
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthData = loadHistoryForMonth(yyyymm);
    for (const [svc, entries] of Object.entries(monthData)) {
      merged[svc] = (merged[svc] ?? []).concat(entries);
    }
  }
  // Sort por ts asc por servicio
  for (const svc of Object.keys(merged)) {
    merged[svc] = merged[svc].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  }
  return merged;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  total: number;
  ok: number;
  uptimePct: number;
  avgLatencyMs: number | null;
}

export function aggregateDaily(entries: HealthCheckEntry[]): DailyStat[] {
  const byDay = new Map<string, { total: number; ok: number; latencySum: number; latencyCount: number }>();
  for (const e of entries) {
    const date = e.ts.slice(0, 10);
    const bucket = byDay.get(date) ?? { total: 0, ok: 0, latencySum: 0, latencyCount: 0 };
    bucket.total++;
    if (e.ok) bucket.ok++;
    if (typeof e.latencyMs === 'number' && Number.isFinite(e.latencyMs)) {
      bucket.latencySum += e.latencyMs;
      bucket.latencyCount++;
    }
    byDay.set(date, bucket);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      total: v.total,
      ok: v.ok,
      uptimePct: v.total ? (v.ok / v.total) * 100 : 100,
      avgLatencyMs: v.latencyCount ? Math.round(v.latencySum / v.latencyCount) : null,
    }));
}

export function currentStatusFor(entries: HealthCheckEntry[]): 'operational' | 'degraded' | 'down' | 'no-data' {
  if (!entries?.length) return 'no-data';
  const last5 = entries.slice(-5);
  const fails = last5.filter((e) => !e.ok).length;
  if (fails === 0) return 'operational';
  if (fails >= 3) return 'down';
  return 'degraded';
}

export function uptimeForLastNDays(entries: HealthCheckEntry[], n = 90): number {
  if (!entries?.length) return 100;
  const cutoff = Date.now() - n * 24 * 60 * 60 * 1000;
  const filtered = entries.filter((e) => new Date(e.ts).getTime() >= cutoff);
  if (filtered.length === 0) return 100;
  const ok = filtered.filter((e) => e.ok).length;
  return (ok / filtered.length) * 100;
}

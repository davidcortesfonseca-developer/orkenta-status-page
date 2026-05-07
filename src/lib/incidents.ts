/**
 * Loader de incidentes desde markdown frontmatter.
 *
 * Cada incidente vive en infrastructure/status-page/incidents/YYYY-MM-DD-slug.md con frontmatter:
 *   ---
 *   id: 2026-05-07-meta-token-rotation
 *   title: Meta access token invalidado — rotación necesaria
 *   started: 2026-05-07T08:00:00Z
 *   resolved: 2026-05-07T14:00:00Z   (omitir si está activo)
 *   severity: P3
 *   services: [api]
 *   ---
 *
 *   ## Update 1 — 08:00 COT
 *   Detectamos que el sync de Meta marketing no recibe...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INCIDENTS_DIR = path.resolve(__dirname, '../../incidents');

export interface Incident {
  id: string;
  title: string;
  started: string;
  resolved: string | null;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  services: string[];
  body: string;
  filename: string;
}

export function loadAllIncidents(): Incident[] {
  if (!fs.existsSync(INCIDENTS_DIR)) return [];
  const files = fs.readdirSync(INCIDENTS_DIR).filter((f) => f.endsWith('.md'));
  return files
    .map((file) => parseIncidentFile(path.join(INCIDENTS_DIR, file), file))
    .filter((x): x is Incident => x !== null)
    .sort((a, b) => (a.started < b.started ? 1 : -1));
}

export function loadActiveIncidents(): Incident[] {
  return loadAllIncidents().filter((x) => !x.resolved);
}

function parseIncidentFile(filePath: string, filename: string): Incident | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!fmMatch) return null;
    const [, frontmatter, body] = fmMatch;
    const meta: Record<string, string> = {};
    for (const line of frontmatter.split('\n')) {
      const m = /^([a-zA-Z_]+):\s*(.+)$/.exec(line.trim());
      if (m) meta[m[1]] = m[2].trim();
    }
    const services = meta.services
      ? meta.services.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    return {
      id: meta.id ?? filename.replace(/\.md$/, ''),
      title: meta.title ?? 'Incidente sin título',
      started: meta.started ?? new Date().toISOString(),
      resolved: meta.resolved && meta.resolved !== 'null' ? meta.resolved : null,
      severity: (meta.severity as 'P1' | 'P2' | 'P3' | 'P4') ?? 'P3',
      services,
      body: body.trim(),
      filename,
    };
  } catch {
    return null;
  }
}

/**
 * Configuración de los servicios monitoreados.
 *
 * Cada entry define:
 *   - id        — slug usado en JSON history y URLs
 *   - label     — nombre visible
 *   - url       — endpoint que el cron pingea
 *   - method    — HEAD por default; cambiar a GET si el server no soporta HEAD
 *   - severity  — qué tan crítica es la caída (P1/P2/P3)
 *   - timeout   — ms antes de marcar como down
 */

export type Severity = 'P1' | 'P2' | 'P3';

export interface ServiceConfig {
  id: string;
  label: string;
  url: string;
  method: 'GET' | 'HEAD';
  severity: Severity;
  timeoutMs: number;
  description: string;
}

export const SERVICES: readonly ServiceConfig[] = [
  {
    id: 'app',
    label: 'App web',
    url: 'https://app.orkenta-ia.com/app/',
    method: 'GET',
    severity: 'P1',
    timeoutMs: 8_000,
    description: 'Operadora Inbox + CRM + Marketing Copilot',
  },
  {
    id: 'api',
    label: 'API REST',
    url: 'https://app.orkenta-ia.com/api/system/auth/me',
    method: 'GET',
    severity: 'P1',
    timeoutMs: 8_000,
    description: 'Backend Fastify productivo (/api/*)',
  },
  {
    id: 'download',
    label: 'Mobile downloads',
    url: 'https://download.orkenta-ia.com/mobile/orkenta-android-v1.0.0.apk',
    method: 'HEAD',
    severity: 'P3',
    timeoutMs: 8_000,
    description: 'CDN para APK Android e IPA iOS (cuando esté disponible)',
  },
  {
    id: 'marketing',
    label: 'Marketing landing',
    url: 'https://orkenta-ia.com/',
    method: 'GET',
    severity: 'P3',
    timeoutMs: 8_000,
    description: 'orkenta-ia.com / orkenta.co landing público',
  },
];

export const SITE = {
  name: 'Orkenta',
  description: 'Estado en tiempo real de la plataforma Orkenta',
  contactEmail: 'soporte@orkenta-ia.com',
  twitterHandle: '@orkenta_ia',
  marketingUrl: 'https://orkenta.co',
  appUrl: 'https://app.orkenta-ia.com',
} as const;

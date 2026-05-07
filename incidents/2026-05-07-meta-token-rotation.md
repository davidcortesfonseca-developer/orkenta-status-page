---
id: 2026-05-07-meta-token-rotation
title: Meta access token invalidado — sync marketing degradado
started: 2026-05-07T08:00:00Z
resolved: 2026-05-07T15:00:00Z
severity: P3
services: [api]
---

## 2026-05-07 08:00 COT — Detección
El sync scheduler de Meta marketing reporta error de token invalidado:
"Error validating access token: The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons."

## Impacto
- El dominio `marketing` corre el sync pero `canonical.meta = null`.
- El legacy sync sigue funcionando (816 leads, 830 conversaciones, 5648 mensajes, 118 campañas).
- Métricas Meta Ads en dashboards no se actualizan hasta rotar el token.

## Mitigación
- Owner debe rotar el token en Meta Business Manager → System Users → Generate New Token.
- Comando para subir el nuevo:
  ```bash
  aws ssm put-parameter --region us-east-2 \
    --name /mad/prod/META_PAGE_ACCESS_TOKEN \
    --value "EAA..." --type SecureString --overwrite
  ```
- Después: reload `.env` desde SSM y restart containers.

## 2026-05-07 15:00 COT — Resuelto
Token rotado en Meta Business Manager y actualizado en SSM Parameter Store.
Validación con `/me`, `/act_304751752013976` y `/insights last_7d` retorna 200 OK.

## Próximos pasos
- Configurar alerta automatizada cuando el sync detecte token expired (CW alarm sobre log filter).
- Considerar rotación programada cada 60 días (hoy es manual).
- Migrar la integración Meta a un MCP server propio de Orkenta para no depender de claude.ai
  (ver `docs/PLAN_MCP_ORKENTA_2026-05-07.md`).

import { ProdEnvReadinessDto, ProdEnvReadinessDtoType } from './dto/atina-system.dto';

const JWT_DOC_PLACEHOLDERS = new Set(
  ['change-me-in-development', 'change-me-in-production'].map((s) => s.toLowerCase())
);
const JWT_REFRESH_DOC_PLACEHOLDERS = new Set(
  ['refresh-change-me-dev', 'refresh-change-me'].map((s) => s.toLowerCase())
);

function envTrim(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** Values from `process.env` only — no secret material (CEO checklist §G.4). */
export function readProdEnvReadinessSignals(): ProdEnvReadinessDtoType {
  const nodeEnv = envTrim('NODE_ENV') || 'development';
  const jwt = envTrim('JWT_SECRET').toLowerCase();
  const jwtRef = envTrim('JWT_REFRESH_SECRET').toLowerCase();
  const dbPass = envTrim('DB_PASSWORD');
  const adminPass = envTrim('ADMIN_PASSWORD');

  const smtpRaw = process.env.SMTP_ENABLED;
  const smtpEnabled =
    typeof smtpRaw === 'string' && smtpRaw.trim().length > 0 && smtpRaw.trim().toLowerCase() === 'true';

  return ProdEnvReadinessDto.parse({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    dbSsl: envTrim('DB_SSL').toLowerCase() === 'true',
    jwtSecretUsesDocumentedPlaceholder: jwt.length === 0 || JWT_DOC_PLACEHOLDERS.has(jwt),
    jwtRefreshSecretUsesDocumentedPlaceholder:
      jwtRef.length === 0 || JWT_REFRESH_DOC_PLACEHOLDERS.has(jwtRef),
    dbPasswordUsesDocumentedPlaceholder: dbPass.length === 0 || dbPass === 'atina_password',
    adminPasswordUsesDocumentedPlaceholder: adminPass.length === 0 || adminPass === 'Admin@123456',
    smtpEnabled,
    smtpHasCredentials: envTrim('SMTP_USER').length > 0 && envTrim('SMTP_PASSWORD').length > 0,
  });
}

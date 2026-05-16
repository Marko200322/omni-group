const DEV_JWT_PLACEHOLDER = 'change-me-min-32-chars-for-development-only';

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters when NODE_ENV=production.'
    );
  }
  if (jwt === DEV_JWT_PLACEHOLDER) {
    throw new Error('JWT_SECRET must not use the development placeholder in production.');
  }

  const cors = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (!cors?.length) {
    throw new Error(
      'CORS_ORIGINS must list at least one origin (comma-separated) when NODE_ENV=production.'
    );
  }
}

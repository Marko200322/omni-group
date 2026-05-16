export function resolveJwtSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    const s = process.env.JWT_SECRET?.trim();
    if (!s) {
      throw new Error('JWT_SECRET is required when NODE_ENV=production.');
    }
    return s;
  }
  return process.env.JWT_SECRET?.trim() ?? 'atina-dev-secret-change-me';
}

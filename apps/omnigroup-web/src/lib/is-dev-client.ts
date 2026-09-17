/** True in local development — hide admin JSON debug dumps in production builds. */
export function isDevClient(): boolean {
  return process.env.NODE_ENV === 'development';
}

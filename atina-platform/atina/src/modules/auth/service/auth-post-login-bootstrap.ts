/** Result shape from workflow template bootstrap (used for audit logging). */
export type AuthBootstrapTemplatesReport = Record<string, unknown>;

/** Pluggable hook for post-registration / first-login workflow template setup. */
export interface AuthPostLoginBootstrap {
  bootstrapTemplates(
    userId: string,
    overwrite?: boolean,
    namePrefix?: string
  ): Promise<AuthBootstrapTemplatesReport>;
}

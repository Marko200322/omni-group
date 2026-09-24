import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AuthenticationError, AuthorizationError } from '../../utils/errors';
import { headerFirst } from '../../utils/http-headers';
import { query } from '../../database/connection';
import { hasOrgPermission, type OrgPermission } from '../../modules/auth/lib/org-permissions';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  planSlug?: string;
  organizationId?: string;
  orgRole?: string;
  authType?: 'jwt' | 'api_key';
  apiKeyPermissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = headerFirst(req.headers.authorization);
  const apiKey = headerFirst(req.headers['x-api-key']);

  if (apiKey) {
    // Handle API key authentication
    authenticateApiKey(apiKey, req, next);
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No authentication token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = { ...payload, authType: 'jwt' };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    }
    throw new AuthenticationError('Invalid authentication token');
  }
}

async function authenticateApiKey(
  rawKey: string,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const { rows } = await query<{
      user_id: string;
      permissions: string[];
      is_active: boolean;
      expires_at: Date | null;
      email: string;
      role: string;
      active_organization_id: string | null;
    }>(
      `SELECT ak.user_id, ak.permissions, ak.is_active, ak.expires_at,
              u.email, u.role, u.active_organization_id
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
      [keyHash]
    );

    if (!rows.length || !rows[0].is_active) {
      throw new AuthenticationError('Invalid or inactive API key');
    }

    const key = rows[0];
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      throw new AuthenticationError('API key has expired');
    }

    const permissions = Array.isArray(key.permissions) && key.permissions.length
      ? key.permissions
      : ['read'];
    const readRequest = ['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET');
    const permitted = permissions.includes('admin')
      || (readRequest
        ? permissions.includes('read') || permissions.includes('write')
        : permissions.includes('write'));
    if (!permitted) {
      throw new AuthorizationError(
        readRequest ? 'API key requires read permission' : 'API key requires write permission'
      );
    }

    // Update last used
    await query('UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1', [keyHash]);

    req.user = {
      userId: key.user_id,
      email: key.email,
      role: key.role,
      organizationId: key.active_organization_id ?? undefined,
      orgRole: 'owner',
      authType: 'api_key',
      apiKeyPermissions: permissions,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AuthenticationError();
    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');

export function requirePermission(...permissions: OrgPermission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AuthenticationError();
    const allowed = permissions.every((permission) =>
      hasOrgPermission({
        permission,
        orgRole: req.user!.orgRole,
        platformRole: req.user!.role,
      }),
    );
    if (!allowed) {
      throw new AuthorizationError('Insufficient workspace permissions');
    }
    next();
  };
}

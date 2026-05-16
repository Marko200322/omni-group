import { NotFoundError, ValidationError } from '../../../utils/errors';
import { ApiGatewayRepository } from '../repository/api-gateway.repository';

export class ApiGatewayService {
  private readonly repo = new ApiGatewayRepository();

  private sanitizeRouteKey(routeKey: string): string {
    const normalized = String(routeKey ?? '').trim();
    if (normalized.length < 3) {
      throw new ValidationError('routeKey must contain at least 3 characters');
    }
    return normalized;
  }

  private sanitizePathTemplate(pathTemplate: string): string {
    const normalized = String(pathTemplate ?? '').trim();
    if (!normalized.startsWith('/')) {
      throw new ValidationError('pathTemplate must start with "/"');
    }
    if (normalized.length < 2) {
      throw new ValidationError('pathTemplate must contain at least 2 characters');
    }
    return normalized;
  }

  private sanitizeMethod(method: string): string {
    const normalized = String(method ?? 'GET').trim().toUpperCase();
    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    if (!allowedMethods.has(normalized)) {
      throw new ValidationError(`Unsupported HTTP method '${normalized}'`);
    }
    return normalized;
  }

  private sanitizeRateLimit(rateLimitPerMinute: number): number {
    const normalized = Number(rateLimitPerMinute);
    if (!Number.isFinite(normalized) || normalized < 1 || normalized > 5000) {
      throw new ValidationError('rateLimitPerMinute must be a number between 1 and 5000');
    }
    return Math.floor(normalized);
  }

  async register(routeKey: string, upstreamSlug: string, pathTemplate: string, method: string, rateLimitPerMinute: number) {
    const normalizedRouteKey = this.sanitizeRouteKey(routeKey);
    const normalizedUpstreamSlug = String(upstreamSlug ?? '').trim();
    if (normalizedUpstreamSlug.length < 2) {
      throw new ValidationError('upstreamSlug must contain at least 2 characters');
    }
    const normalizedPathTemplate = this.sanitizePathTemplate(pathTemplate);
    const normalizedMethod = this.sanitizeMethod(method);
    const normalizedRateLimit = this.sanitizeRateLimit(rateLimitPerMinute);
    const { rows } = await this.repo.register(
      normalizedRouteKey,
      normalizedUpstreamSlug,
      normalizedPathTemplate,
      normalizedMethod,
      normalizedRateLimit
    );
    return rows[0];
  }

  async list() {
    const { rows } = await this.repo.list();
    return rows;
  }

  async proxy(routeKey: string, payload: Record<string, unknown>) {
    const normalizedRouteKey = this.sanitizeRouteKey(routeKey);
    const safePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const { rows } = await this.repo.getByKey(normalizedRouteKey);
    if (!rows[0]) throw new NotFoundError('Gateway route');
    const route = rows[0] as Record<string, unknown>;
    const upstreamSlug = String(route.upstream_slug ?? route.upstreamSlug ?? '').trim();
    const pathTemplate = String(route.path_template ?? route.pathTemplate ?? '').trim();
    const method = this.sanitizeMethod(String(route.method ?? 'GET'));
    if (!upstreamSlug || !pathTemplate) {
      throw new ValidationError('Gateway route configuration is invalid');
    }
    const proxiedAt = new Date().toISOString();
    const dispatchedTo = `${upstreamSlug}:${pathTemplate}`;
    return {
      status: 'ok',
      operation: 'proxy',
      routeKey: normalizedRouteKey,
      upstreamSlug,
      dispatchedTo,
      method,
      payloadEcho: safePayload,
      proxiedAt,
      route: {
        routeKey: normalizedRouteKey,
        upstreamSlug,
        pathTemplate,
        method,
        rateLimitPerMinute: Number(route.rate_limit_per_minute ?? route.rateLimitPerMinute ?? 0),
      },
    };
  }
}

import { query } from '../../../database/connection';

export class ApiGatewayRepository {
  register(routeKey: string, upstreamSlug: string, pathTemplate: string, method: string, rateLimitPerMinute: number) {
    return query(
      `INSERT INTO gateway_routes
       (route_key, upstream_slug, path_template, method, rate_limit_per_minute)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (route_key) DO UPDATE
         SET upstream_slug = EXCLUDED.upstream_slug,
             path_template = EXCLUDED.path_template,
             method = EXCLUDED.method,
             rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
             updated_at = NOW()
       RETURNING *`,
      [routeKey, upstreamSlug, pathTemplate, method, rateLimitPerMinute]
    );
  }

  list() {
    return query(`SELECT * FROM gateway_routes ORDER BY route_key`);
  }

  getByKey(routeKey: string) {
    return query(`SELECT * FROM gateway_routes WHERE route_key = $1 AND is_active = true`, [routeKey]);
  }
}

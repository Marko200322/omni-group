import { ProxyRouteDto, RegisterGatewayRouteDto } from '../../modules/api-gateway/dto/api-gateway.dto';

describe('Api Gateway DTOs', () => {
  it('RegisterGatewayRouteDto applies method and rate defaults', () => {
    const r = RegisterGatewayRouteDto.safeParse({
      routeKey: 'abc',
      upstreamSlug: 'ab',
      pathTemplate: '/x',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.method).toBe('GET');
      expect(r.data.rateLimitPerMinute).toBe(120);
    }
  });

  it('RegisterGatewayRouteDto rejects short keys and invalid rate', () => {
    expect(
      RegisterGatewayRouteDto.safeParse({
        routeKey: 'ab',
        upstreamSlug: 'ab',
        pathTemplate: '/x',
      }).success
    ).toBe(false);
    expect(
      RegisterGatewayRouteDto.safeParse({
        routeKey: 'abc',
        upstreamSlug: 'a',
        pathTemplate: '/x',
      }).success
    ).toBe(false);
    expect(
      RegisterGatewayRouteDto.safeParse({
        routeKey: 'abc',
        upstreamSlug: 'ab',
        pathTemplate: 'x',
      }).success
    ).toBe(false);
    expect(
      RegisterGatewayRouteDto.safeParse({
        routeKey: 'abc',
        upstreamSlug: 'ab',
        pathTemplate: '/x',
        rateLimitPerMinute: 0,
      }).success
    ).toBe(false);
  });

  it('ProxyRouteDto defaults payload', () => {
    const r = ProxyRouteDto.safeParse({ routeKey: 'key123' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.payload).toEqual({});
  });

  it('ProxyRouteDto rejects short routeKey', () => {
    expect(ProxyRouteDto.safeParse({ routeKey: 'ab' }).success).toBe(false);
  });
});

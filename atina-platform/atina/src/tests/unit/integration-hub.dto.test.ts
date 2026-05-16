import { CreateIntegrationDto, SyncIntegrationDto } from '../../modules/integration-hub/dto/integration-hub.dto';

describe('Integration-hub DTOs (Zod)', () => {
  describe('CreateIntegrationDto', () => {
    it('applies defaults for credentials and config', () => {
      const r = CreateIntegrationDto.safeParse({
        providerSlug: 'slack',
        displayName: 'Slack',
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.credentials).toEqual({});
        expect(r.data.config).toEqual({});
      }
    });

    it('rejects providerSlug or displayName shorter than min length', () => {
      expect(CreateIntegrationDto.safeParse({ providerSlug: 's', displayName: 'Ok' }).success).toBe(
        false
      );
      expect(CreateIntegrationDto.safeParse({ providerSlug: 'ok', displayName: 'x' }).success).toBe(
        false
      );
    });

    it('rejects unknown body keys (strict)', () => {
      expect(
        CreateIntegrationDto.safeParse({
          providerSlug: 'slack',
          displayName: 'Slack',
          extraField: 1,
        }).success
      ).toBe(false);
    });

    it('trims providerSlug and displayName before length checks', () => {
      const r = CreateIntegrationDto.safeParse({
        providerSlug: '  slack  ',
        displayName: '  Slack workspace  ',
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.providerSlug).toBe('slack');
        expect(r.data.displayName).toBe('Slack workspace');
      }
    });
  });

  describe('SyncIntegrationDto', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('parses valid integration id', () => {
      const r = SyncIntegrationDto.safeParse({ integrationId: validUuid });
      expect(r.success).toBe(true);
    });

    it('rejects non-uuid integrationId', () => {
      expect(SyncIntegrationDto.safeParse({ integrationId: 'not-a-uuid' }).success).toBe(false);
    });

    it('accepts uuid integrationId with surrounding whitespace', () => {
      const r = SyncIntegrationDto.safeParse({
        integrationId: `  ${validUuid}  `,
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.integrationId).toBe(validUuid);
      }
    });

    it('rejects unknown body keys (strict)', () => {
      expect(
        SyncIntegrationDto.safeParse({ integrationId: validUuid, foo: 'bar' }).success
      ).toBe(false);
    });
  });
});

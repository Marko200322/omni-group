import {
  CreateBackupDto,
  ListBackupsQueryDto,
  RestoreBackupDto,
} from '../../modules/backup-recovery/dto/backup-recovery.dto';

describe('Backup-recovery DTOs (Zod)', () => {
  describe('ListBackupsQueryDto', () => {
    it('defaults limit to 50 when omitted', () => {
      const r = ListBackupsQueryDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.limit).toBe(50);
    });

    it('coerces string limit and clamps to schema min/max rules', () => {
      const r = ListBackupsQueryDto.safeParse({ limit: '10' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.limit).toBe(10);
    });

    it('rejects unknown query keys', () => {
      expect(ListBackupsQueryDto.safeParse({ limit: '5', extra: 'x' }).success).toBe(false);
    });

    it('rejects limit below 1 or above 100', () => {
      expect(ListBackupsQueryDto.safeParse({ limit: '0' }).success).toBe(false);
      expect(ListBackupsQueryDto.safeParse({ limit: '101' }).success).toBe(false);
    });
  });

  describe('CreateBackupDto', () => {
    it('applies defaults for empty body', () => {
      const r = CreateBackupDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.snapshotType).toBe('manual');
        expect(r.data.metadata).toEqual({});
      }
    });

    it('accepts scheduled snapshot and metadata', () => {
      const r = CreateBackupDto.safeParse({
        snapshotType: 'scheduled',
        metadata: { region: 'eu-west', tier: 'hot' },
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.snapshotType).toBe('scheduled');
        expect(r.data.metadata).toEqual({ region: 'eu-west', tier: 'hot' });
      }
    });

    it('rejects invalid snapshotType', () => {
      expect(CreateBackupDto.safeParse({ snapshotType: 'full' }).success).toBe(false);
    });

    it('accepts undefined/null body via preprocess', () => {
      expect(CreateBackupDto.safeParse(undefined).success).toBe(true);
      expect(CreateBackupDto.safeParse(null).success).toBe(true);
    });

    it('rejects unknown keys (strict)', () => {
      expect(CreateBackupDto.safeParse({ snapshotType: 'manual', tag: 'x' } as Record<string, unknown>).success).toBe(
        false
      );
    });
  });

  describe('RestoreBackupDto', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('parses valid restore payload', () => {
      const r = RestoreBackupDto.safeParse({
        snapshotId: validUuid,
        reason: 'customer request',
      });
      expect(r.success).toBe(true);
    });

    it('rejects non-uuid snapshotId', () => {
      expect(
        RestoreBackupDto.safeParse({ snapshotId: 'not-uuid', reason: 'valid text' }).success
      ).toBe(false);
    });

    it('rejects reason shorter than 3 or longer than 255', () => {
      expect(RestoreBackupDto.safeParse({ snapshotId: validUuid, reason: 'ab' }).success).toBe(false);
      expect(
        RestoreBackupDto.safeParse({ snapshotId: validUuid, reason: 'x'.repeat(256) }).success
      ).toBe(false);
    });

    it('rejects unknown keys (strict)', () => {
      expect(
        RestoreBackupDto.safeParse({
          snapshotId: validUuid,
          reason: 'valid reason text',
          force: true,
        } as Record<string, unknown>).success
      ).toBe(false);
    });
  });
});

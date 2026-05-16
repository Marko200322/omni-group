import {
  CreateFollowUpAutomationDto,
  FollowUpAutomationRunParamsDto,
  FollowUpAutomationStatusDto,
  RunFollowUpAutomationDto,
} from '../../../../modules/follow-up-automation/dto/follow-up-automation.dto';

describe('FollowUpAutomation DTOs', () => {
  describe('CreateFollowUpAutomationDto', () => {
    it('accepts minimal valid input with defaults', () => {
      const parsed = CreateFollowUpAutomationDto.parse({ name: 'abc' });
      expect(parsed).toMatchObject({
        name: 'abc',
        budgetAllocated: 0,
        followUpStrategy: 'balanced',
      });
    });

    it('rejects invalid strategy enum', () => {
      expect(() =>
        CreateFollowUpAutomationDto.parse({ name: 'abc', followUpStrategy: 'nope' })
      ).toThrow();
    });

    it('rejects strict unknown keys', () => {
      expect(() =>
        CreateFollowUpAutomationDto.parse({ name: 'abc', foo: 'bar' } as Record<string, unknown>)
      ).toThrow();
    });
  });

  describe('RunFollowUpAutomationDto', () => {
    it('applies defaults', () => {
      const parsed = RunFollowUpAutomationDto.parse({});
      expect(parsed).toMatchObject({
        mode: 'schedule',
        intensity: 25,
      });
      expect(parsed).not.toHaveProperty('revenueEstimate');
    });

    it('rejects invalid mode', () => {
      expect(() => RunFollowUpAutomationDto.parse({ mode: 'blast' })).toThrow();
    });
  });

  describe('FollowUpAutomationRunParamsDto', () => {
    it('accepts hyphen in id', () => {
      expect(FollowUpAutomationRunParamsDto.parse({ id: 'a-b' })).toEqual({ id: 'a-b' });
    });

    it('rejects id shorter than min length', () => {
      expect(() => FollowUpAutomationRunParamsDto.parse({ id: 'a' })).toThrow();
    });
  });

  describe('FollowUpAutomationStatusDto', () => {
    it('parses nested pipelineCapacity', () => {
      const data = {
        strategies: ['aggressive', 'balanced', 'light'],
        activeStrategy: 'balanced',
        pipelineCapacity: { maxFollowUpsPerRun: 400, cooldownSeconds: 25 },
      };
      expect(FollowUpAutomationStatusDto.parse(data)).toEqual(data);
    });
  });
});

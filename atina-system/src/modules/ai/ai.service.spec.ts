import { Test, TestingModule } from '@nestjs/testing';
import { PhaseService } from '../../phase-launch/phase.service';
import { AiService } from './ai.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AiService', () => {
  let moduleRef: TestingModule;
  let service: AiService;
  let phase: jest.Mocked<Pick<PhaseService, 'isAiEnabled' | 'getPhase'>>;

  beforeEach(async () => {
    phase = {
      isAiEnabled: jest.fn(),
      getPhase: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PhaseService, useValue: phase },
      ],
    }).compile();

    service = moduleRef.get(AiService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('chat', () => {
    it('returns locked reply when AI phase is disabled', () => {
      phase.isAiEnabled.mockReturnValue(false);
      phase.getPhase.mockReturnValue('v1');

      const result = service.chat({ prompt: 'hello' });

      expect(result.reply).toBe(
        'AI modul je zaključan za ovu fazu. Postavi PHASE=v3 ili novije.',
      );
      expect(result.phase).toBe('v1');
      expect(result.sessionId).toMatch(UUID_RE);
    });

    it('uses provided sessionId when AI is disabled', () => {
      phase.isAiEnabled.mockReturnValue(false);
      phase.getPhase.mockReturnValue('v2');
      const sid = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

      const result = service.chat({ prompt: 'x', sessionId: sid });

      expect(result.sessionId).toBe(sid);
    });

    it('returns stub reply including truncated prompt when AI is enabled', () => {
      phase.isAiEnabled.mockReturnValue(true);
      phase.getPhase.mockReturnValue('v3');
      const longPrompt = 'p'.repeat(250);

      const result = service.chat({ prompt: longPrompt });

      expect(result.phase).toBe('v3');
      expect(result.reply).toContain('[Atina AI stub]');
      expect(result.reply).toContain('p'.repeat(200));
      expect(result.reply).toContain('…');
    });

    it('uses sessionId from dto when AI is enabled', () => {
      phase.isAiEnabled.mockReturnValue(true);
      phase.getPhase.mockReturnValue('v4');
      const sid = '00000000-0000-4000-8000-000000000002';

      const result = service.chat({ prompt: 'hi', sessionId: sid });

      expect(result.sessionId).toBe(sid);
    });

    it('generates sessionId when omitted and AI is enabled', () => {
      phase.isAiEnabled.mockReturnValue(true);
      phase.getPhase.mockReturnValue('v3');

      const result = service.chat({ prompt: 'a' });

      expect(result.sessionId).toMatch(UUID_RE);
    });

    it('calls phase gates once per chat', () => {
      phase.isAiEnabled.mockReturnValue(true);
      phase.getPhase.mockReturnValue('v3');

      service.chat({ prompt: 'ping' });

      expect(phase.isAiEnabled).toHaveBeenCalledTimes(1);
      expect(phase.getPhase).toHaveBeenCalledTimes(1);
    });

    it('stub reply embeds full short prompt before ellipsis', () => {
      phase.isAiEnabled.mockReturnValue(true);
      phase.getPhase.mockReturnValue('v3');
      const text = 'short';

      const result = service.chat({ prompt: text });

      expect(result.reply).toContain(`Primljeno: ${text}`);
      expect(result.reply).toContain('…');
    });
  });

  describe('session', () => {
    it('returns ok and a new session id', () => {
      const result = service.session();

      expect(result.ok).toBe(true);
      expect(result.sessionId).toMatch(UUID_RE);
    });
  });
});

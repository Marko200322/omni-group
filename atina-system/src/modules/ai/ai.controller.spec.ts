import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let moduleRef: TestingModule;
  let controller: AiController;
  let ai: jest.Mocked<Pick<AiService, 'chat' | 'session'>>;

  beforeEach(async () => {
    ai = {
      chat: jest.fn(),
      session: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: ai }],
    }).compile();

    controller = moduleRef.get(AiController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('POST chat forwards body to AiService.chat', () => {
    const payload = {
      reply: 'ok',
      sessionId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      phase: 'v3',
    };
    ai.chat.mockReturnValue(payload);

    const dto = { prompt: 'hello', sessionId: payload.sessionId };
    const result = controller.chat(dto);

    expect(ai.chat).toHaveBeenCalledWith(dto);
    expect(result).toBe(payload);
  });

  it('POST session proxies to AiService.session', () => {
    const payload = { sessionId: randomUUID(), ok: true };
    ai.session.mockReturnValue(payload);

    const result = controller.session();

    expect(ai.session).toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('POST chat forwards prompt-only body', () => {
    const payload = {
      reply: 'stub',
      sessionId: '22222222-2222-4222-8222-222222222222',
      phase: 'v3',
    };
    ai.chat.mockReturnValue(payload);
    const dto = { prompt: 'only' };

    const result = controller.chat(dto);

    expect(ai.chat).toHaveBeenCalledWith(dto);
    expect(result).toBe(payload);
  });
});

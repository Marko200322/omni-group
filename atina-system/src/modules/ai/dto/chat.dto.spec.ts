import { validate } from 'class-validator';
import { CreateChatDto } from './chat.dto';

describe('CreateChatDto', () => {
  it('accepts prompt only', async () => {
    const dto = Object.assign(new CreateChatDto(), { prompt: 'hello' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts prompt with valid sessionId', async () => {
    const sid = '11111111-1111-4111-8111-111111111111';
    const dto = Object.assign(new CreateChatDto(), {
      prompt: 'x',
      sessionId: sid,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects missing prompt', async () => {
    const dto = Object.assign(new CreateChatDto(), {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'prompt')).toBe(true);
  });

  it('rejects non-string prompt', async () => {
    const dto = Object.assign(new CreateChatDto(), {
      prompt: 123 as unknown as string,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'prompt')).toBe(true);
  });

  it('rejects invalid sessionId when provided', async () => {
    const dto = Object.assign(new CreateChatDto(), {
      prompt: 'ok',
      sessionId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sessionId')).toBe(true);
  });
});

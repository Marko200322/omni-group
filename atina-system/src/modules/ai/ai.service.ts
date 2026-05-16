import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PhaseService } from '../../phase-launch/phase.service';
import { CreateChatDto } from './dto/chat.dto';

/** AI Assistant (FAZA 3 u PDF-u) — stub dok nema OPENAI_API_KEY. */
@Injectable()
export class AiService {
  constructor(private readonly phase: PhaseService) {}

  chat(dto: CreateChatDto) {
    const enabled = this.phase.isAiEnabled();
    return {
      reply: enabled
        ? `[Atina AI stub] Primljeno: ${dto.prompt.slice(0, 200)}… (poveži OpenAI u produkciji)`
        : 'AI modul je zaključan za ovu fazu. Postavi PHASE=v3 ili novije.',
      sessionId: dto.sessionId ?? randomUUID(),
      phase: this.phase.getPhase(),
    };
  }

  session() {
    return { sessionId: randomUUID(), ok: true };
  }
}

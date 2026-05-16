import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  chat(@Body() dto: CreateChatDto) {
    return this.ai.chat(dto);
  }

  @Post('session')
  session() {
    return this.ai.session();
  }
}

import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChatDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

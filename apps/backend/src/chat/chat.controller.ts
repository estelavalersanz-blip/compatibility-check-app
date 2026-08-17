import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Conversation, Message } from '@compatibility-check-app/shared-types';
import type { AuthenticatedRequest } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ChatService } from './chat.service';

/**
 * `conversations` (internal-chat spec): todas las rutas exigen sesión — el chat nunca es público.
 * `POST /conversations` es la única escritura que pasa por la comprobación de elegibilidad contra
 * `comparisons` (design.md, decisión 9); el resto solo exige ser participante, comprobado en
 * `ChatService`.
 */
@Controller('conversations')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  start(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const candidateUserId =
      typeof body.candidateUserId === 'string' ? body.candidateUserId.trim() : '';
    if (!candidateUserId) {
      throw new BadRequestException('"candidateUserId" es obligatorio');
    }
    return this.chatService.startConversation(request.user.id, candidateUserId);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<Conversation[]> {
    return this.chatService.listConversations(request.user.id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Message[]> {
    return this.chatService.getMessages(id, request.user.id);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<Message> {
    const text = typeof body.body === 'string' ? body.body : '';
    if (!text.trim()) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }
    return this.chatService.sendMessage(id, request.user.id, text);
  }
}

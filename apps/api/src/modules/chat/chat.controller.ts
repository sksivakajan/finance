import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createConversationSchema,
  createMessageSchema,
  updateMessageSchema,
  type CreateConversationInput,
  type CreateMessageInput,
  type UpdateMessageInput,
} from '@finance/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { parsePagination } from '../../common/pagination.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';
import { ChatService } from './chat.service.js';

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('conversations')
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createConversationSchema))
    body: CreateConversationInput,
  ) {
    return this.chat.getOrCreateConversation(user.sub, body.friendUserId);
  }

  @Get('conversations')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.chat.listConversations(user.sub);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(
      user.sub,
      id,
      parsePagination({ cursor, limit }),
    );
  }

  @Post('conversations/:id/messages')
  @RateLimit({ points: 60, windowSeconds: 60 })
  sendMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createMessageSchema)) body: CreateMessageInput,
  ) {
    return this.chat.createMessage(user.sub, id, body);
  }

  @Post('conversations/:id/read')
  markRead(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.chat.markRead(user.sub, id);
  }

  @Patch('messages/:id')
  updateMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMessageSchema)) body: UpdateMessageInput,
  ) {
    return this.chat.updateMessage(user.sub, id, body);
  }

  @Delete('messages/:id')
  deleteMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.chat.deleteMessage(user.sub, id);
  }
}

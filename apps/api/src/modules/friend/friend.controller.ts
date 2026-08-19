import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  sendFriendRequestSchema,
  type SendFriendRequestInput,
} from '@finance/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';
import { FriendService } from './friend.service.js';

@Controller('friends')
export class FriendController {
  constructor(private readonly friends: FriendService) {}

  @Get('search')
  @RateLimit({ points: 30, windowSeconds: 60 })
  search(@CurrentUser() user: AccessTokenPayload, @Query('q') q?: string) {
    return this.friends.search(user.sub, q ?? '');
  }

  @Get('requests')
  listRequests(
    @CurrentUser() user: AccessTokenPayload,
    @Query('direction') direction?: string,
  ) {
    return this.friends.listRequests(
      user.sub,
      direction === 'outgoing' ? 'outgoing' : 'incoming',
    );
  }

  @Post('requests')
  @RateLimit({ points: 20, windowSeconds: 60 })
  sendRequest(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(sendFriendRequestSchema))
    body: SendFriendRequestInput,
  ) {
    return this.friends.sendRequest(user.sub, body.username);
  }

  @Post('requests/:id/accept')
  accept(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.friends.respond(user.sub, id, 'accept');
  }

  @Post('requests/:id/reject')
  reject(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.friends.respond(user.sub, id, 'reject');
  }

  @Post('requests/:id/cancel')
  cancel(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.friends.respond(user.sub, id, 'cancel');
  }

  @Get('blocked')
  listBlocked(@CurrentUser() user: AccessTokenPayload) {
    return this.friends.listBlocked(user.sub);
  }

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.friends.listFriends(user.sub);
  }

  @Delete(':friendshipId')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friends.removeFriend(user.sub, friendshipId);
  }

  @Post(':userId/block')
  block(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId') userId: string,
  ) {
    return this.friends.block(user.sub, userId);
  }

  @Post(':userId/unblock')
  unblock(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId') userId: string,
  ) {
    return this.friends.unblock(user.sub, userId);
  }
}

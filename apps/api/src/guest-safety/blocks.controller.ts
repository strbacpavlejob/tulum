import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { CreateBlockDto } from './dto/create-block.dto';
import { GuestSafetyService } from './guest-safety.service';

@ApiTags('blocks')
@Controller('blocks')
export class BlocksController {
  constructor(private readonly guestSafety: GuestSafetyService) {}

  /**
   * POST /blocks: block a guest. It works both ways: each leaves the other's
   * Matches deck, event guest lists, inbox and chats. Blocking again
   * changes nothing.
   */
  @Post()
  async block(@UserId() userId: string, @Body() body: CreateBlockDto) {
    return this.guestSafety.blockGuest(userId, body.user_id);
  }
}

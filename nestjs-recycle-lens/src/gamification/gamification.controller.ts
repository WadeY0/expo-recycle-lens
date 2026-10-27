import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { GetUser } from 'src/identities/auth/decorators/get-user.decorator';
import { GamificationService } from './gamification.service';
import {
  GamificationQueryDto,
  ChallengeKeyDto,
} from './dto/gamification-query.dto';

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}
  @Get('overview')
  overview(@GetUser('id') userId: string) {
    return this.gamification.overview(userId);
  }
  @Get('xp-history')
  xpHistory(
    @GetUser('id') userId: string,
    @Query() query: GamificationQueryDto,
  ) {
    return this.gamification.xpHistory(userId, query);
  }
  @Get('discoveries')
  discoveries(
    @GetUser('id') userId: string,
    @Query() query: GamificationQueryDto,
  ) {
    return this.gamification.discoveries(userId, query);
  }
  @Get('achievements')
  achievements(@GetUser('id') userId: string) {
    return this.gamification.achievements(userId);
  }
  @Get('challenges')
  challenges(@GetUser('id') userId: string) {
    return this.gamification.challenges(userId);
  }
  @Get('challenges/:key')
  challenge(@GetUser('id') userId: string, @Param() params: ChallengeKeyDto) {
    return this.gamification.challenge(userId, params.key);
  }
  @Get('plant')
  plant(@GetUser('id') userId: string) {
    return this.gamification.plant(userId);
  }
}

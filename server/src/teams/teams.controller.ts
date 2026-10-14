import {
  Controller, Post, Get, Delete, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTeamDto } from './dto/create-team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('join/:invite_code')
  join(
    @CurrentUser('id') userId: string,
    @Param('invite_code') inviteCode: string,
  ) {
    return this.service.joinByInvite(userId, inviteCode);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(teamId, memberId, userId);
  }

  @Patch(':id/invite-code')
  regenerateInviteCode(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
  ) {
    return this.service.regenerateInviteCode(teamId, userId);
  }

  @Patch(':id/captain')
  transferCaptaincy(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Body('new_captain_id') newCaptainId: string,
  ) {
    return this.service.transferCaptaincy(teamId, newCaptainId, userId);
  }
}

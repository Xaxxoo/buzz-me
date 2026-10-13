import {
  Controller, Get, Put, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSaveDto } from './dto/update-save.dto';
import { LinkUniversityDto } from './dto/link-university.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/save')
  @UseGuards(JwtAuthGuard)
  getSave(@CurrentUser('id') userId: string) {
    return this.usersService.getSaveData(userId);
  }

  @Put('me/save')
  @UseGuards(JwtAuthGuard)
  updateSave(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSaveDto,
  ) {
    return this.usersService.updateSaveData(userId, dto.save);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUser(@Param('id') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

  @Post('me/university')
  @UseGuards(JwtAuthGuard)
  linkUniversity(
    @CurrentUser('id') userId: string,
    @Body() dto: LinkUniversityDto,
  ) {
    return this.usersService.linkUniversity(userId, dto.university_id);
  }
}

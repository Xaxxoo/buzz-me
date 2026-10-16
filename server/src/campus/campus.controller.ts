import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CampusService } from './campus.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin/campuses')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CampusController {
  constructor(private readonly service: CampusService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string;
    university_id?: string | null;
    layout?: Record<string, any>;
    asset_url?: string | null;
    fallback_image_url?: string | null;
    osm_attribution?: string | null;
    active?: boolean;
  }) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string;
    university_id: string | null;
    layout: Record<string, any>;
    asset_url: string | null;
    fallback_image_url: string | null;
    osm_attribution: string | null;
    active: boolean;
  }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/landmarks')
  findLandmarks(@Param('id') id: string) {
    return this.service.findLandmarks(id);
  }

  @Post(':id/landmarks')
  createLandmark(@Param('id') id: string, @Body() body: {
    key: string;
    name: string;
    description?: string | null;
    position_x?: number;
    position_y?: number;
    challenge_question_count?: number;
  }) {
    return this.service.createLandmark(id, body);
  }

  @Put('landmarks/:id')
  updateLandmark(@Param('id') id: string, @Body() body: Partial<{
    key: string;
    name: string;
    description: string | null;
    position_x: number;
    position_y: number;
    challenge_question_count: number;
  }>) {
    return this.service.updateLandmark(id, body);
  }

  @Delete('landmarks/:id')
  removeLandmark(@Param('id') id: string) {
    return this.service.removeLandmark(id);
  }
}

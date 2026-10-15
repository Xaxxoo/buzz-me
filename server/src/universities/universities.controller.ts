import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UniversitiesService } from './universities.service';
import { SearchUniversityDto } from './dto/search-university.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('universities')
export class UniversitiesController {
  constructor(private readonly service: UniversitiesService) {}

  @Get()
  findAll(@Query() dto: SearchUniversityDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.service.getProfile(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() body: {
    name: string;
    short_name: string;
    country: string;
    email_domains?: string[];
    color_a: string;
    color_b: string;
    pattern: string;
  }) {
    return this.service.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string;
    short_name: string;
    country: string;
    email_domains: string[];
    color_a: string;
    color_b: string;
    pattern: string;
    logo_url: string;
  }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

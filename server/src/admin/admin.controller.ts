import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.service.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      q,
    );
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { is_admin?: boolean; university_id?: string | null },
  ) {
    return this.service.updateUser(id, body);
  }

  @Get('matches')
  getMatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.getMatches(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      type,
    );
  }

  @Get('matches/:id')
  getMatch(@Param('id') id: string) {
    return this.service.getMatch(id);
  }

  @Get('categories')
  getCategories() {
    return this.categoriesService.findAllWithCounts(true);
  }
}

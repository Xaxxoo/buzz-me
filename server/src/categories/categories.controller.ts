import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get('with-counts')
  findAllWithCounts() {
    return this.service.findAllWithCounts();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}

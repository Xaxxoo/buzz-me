import { Controller, Get, Param, Query } from '@nestjs/common';
import { UniversitiesService } from './universities.service';
import { SearchUniversityDto } from './dto/search-university.dto';

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
}

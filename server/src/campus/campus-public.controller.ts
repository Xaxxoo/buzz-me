import { Controller, Get, Param } from '@nestjs/common';
import { CampusService } from './campus.service';

@Controller('campuses/public')
export class CampusPublicController {
  constructor(private readonly service: CampusService) {}

  @Get(':universityId')
  findByUniversity(@Param('universityId') universityId: string) {
    return this.service.findByUniversity(universityId);
  }
}

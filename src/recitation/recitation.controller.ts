import { Controller, Get, Post, Param } from '@nestjs/common';
import { RecitationService } from './recitation.service';

@Controller('recitations')
export class RecitationController {
  constructor(private readonly recitationService: RecitationService) {}

  @Post()
  @Get()
  findAll() {
    return this.recitationService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.recitationService.findOne(slug);
  }
}

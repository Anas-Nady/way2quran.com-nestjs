import { Controller, Get, Param, Query } from '@nestjs/common';
import { SurahService } from './surah.service';

@Controller('surah')
export class SurahController {
  constructor(private readonly surahService: SurahService) {}

  @Get(':slug')
  getSurahInfo(
    @Param('slug') slug: string,
    @Query('selectField') fields: string,
  ) {
    return this.surahService.getSurahInfo(slug, fields);
  }

  @Get()
  findAll() {
    return this.surahService.findAll();
  }
}

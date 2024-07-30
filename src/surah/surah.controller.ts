import { Controller, Get, Param } from '@nestjs/common';
import { SurahService } from './surah.service';

@Controller('surah')
export class SurahController {
  constructor(private readonly surahService: SurahService) {}

  @Get('info/:slug')
  getSurahInfo(@Param('slug') slug: string) {
    return this.surahService.getSurahInfo(slug);
  }

  @Get()
  findAll() {
    return this.surahService.findAll();
  }

  @Get(':reciterSlug/:recitationSlug/:surahSlug')
  getReciterWithSurah(
    @Param('reciterSlug') reciterSlug: string,
    @Param('recitationSlug') recitationSlug: string,
    @Param('surahSlug') surahSlug: string,
  ) {
    return this.surahService.getSurahWithReciter(
      reciterSlug,
      recitationSlug,
      surahSlug,
    );
  }
}

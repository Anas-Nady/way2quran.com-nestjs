import { ReciterService } from './../reciter/reciter.service';
import { Controller, Get, Param } from '@nestjs/common';
import { RecitationService } from './recitation.service';

@Controller('recitations')
export class RecitationController {
  constructor(
    private readonly recitationService: RecitationService,
    private readonly reciterService: ReciterService,
  ) {}

  @Get()
  findAll() {
    return this.recitationService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.recitationService.findOne(slug);
  }

  @Get('missing-download-urls/:reciterSlug')
  getRecitationsWithMissingDownloadURLs(
    @Param('reciterSlug') reciterSlug: string,
  ) {
    return this.reciterService.getRecitationsWithMissingDownloadURLs(
      reciterSlug,
    );
  }
}

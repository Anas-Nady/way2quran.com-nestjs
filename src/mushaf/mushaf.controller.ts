import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MushafService } from './mushaf.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('mushaf')
export class MushafController {
  constructor(private readonly mushafService: MushafService) {}

  @Get('')
  @UseGuards(AuthGuard('jwt'))
  async getAllMushafs() {
    return await this.mushafService.getAllMushafs();
  }

  @Post('increment/:slug')
  async incrementDownloadCount(@Query('slug') slug: string) {
    return await this.mushafService.incrementDownloadCount(slug);
  }
}

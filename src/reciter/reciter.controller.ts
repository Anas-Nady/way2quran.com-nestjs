import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReciterService } from './reciter.service';
import { CreateReciterDto } from './dto/create-reciter.dto';
import { UpdateReciterDto } from './dto/update-reciter.dto';
import type { Response, Query as QueryType } from 'express-serve-static-core';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';

@Controller('reciters')
export class ReciterController {
  constructor(private readonly reciterService: ReciterService) {}

  @Post('new')
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  createReciter(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20048 }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    @Body()
    createReciterDto: CreateReciterDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.reciterService.createReciter(createReciterDto, photo);
  }

  @Post('upload-recitation')
  @UseGuards(AuthGuard())
  @UseInterceptors(FilesInterceptor('audioFiles'))
  uploadRecitation(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'audio/*' })],
      }),
    )
    @Query()
    query: QueryType,
    @UploadedFile() audioFiles: Express.Multer.File[],
  ) {
    return this.reciterService.uploadRecitation(query, audioFiles);
  }

  @Get()
  findAll(@Query() query: QueryType) {
    return this.reciterService.findAll(query);
  }

  @Get(':slug/info')
  getReciterInfo(@Param('slug') slug: string) {
    return this.reciterService.getReciterInfo(slug);
  }

  @Get(':slug/details')
  findOne(@Param('slug') slug: string, @Query() query: QueryType) {
    return this.reciterService.getReciterDetails(slug, query);
  }

  @Patch(':slug')
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  updateReciter(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2048 }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    @Param('slug')
    slug: string,
    @Body() updateReciterDto: UpdateReciterDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.reciterService.updateReciter(slug, updateReciterDto, photo);
  }

  @Get('download-recitation/:reciterSlug/:recitationSlug')
  downloadRecitation(
    @Param('reciterSlug') reciterSlug: string,
    @Param('recitationSlug') recitationSlug: string,
    @Res() res: Response,
  ) {
    return this.reciterService.downloadRecitation(
      reciterSlug,
      recitationSlug,
      res,
    );
  }

  @Delete(':slug')
  @UseGuards(AuthGuard())
  removeReciter(@Param('slug') reciterSlug: string) {
    return this.reciterService.removeReciter(reciterSlug);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard())
  removeRecitation(
    @Param('slug') reciterSlug: string,
    @Query() query: QueryType,
  ) {
    return this.reciterService.removeRecitation(reciterSlug, query);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard())
  removeSurah(@Param('slug') reciterSlug: string, @Query() query: QueryType) {
    return this.reciterService.removeSurah(reciterSlug, query);
  }
}

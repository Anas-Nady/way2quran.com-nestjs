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
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const tmpDir = path.join(__dirname, '../../uploads/tmp');

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = diskStorage({
  destination: tmpDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

@Controller('reciters')
export class ReciterController {
  constructor(private readonly reciterService: ReciterService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('photo', {
      storage,
      limits: {
        fileSize: 1 * 1024 * 1204, // 1 MB
      },
    }),
  )
  createReciter(
    @Body() createReciterDto: CreateReciterDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    photo?: Express.Multer.File,
  ) {
    return this.reciterService.createReciter(createReciterDto, photo);
  }

  @Post('upload-recitation')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FilesInterceptor('audioFiles', 114, {
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5 GB
      },
    }),
  )
  uploadRecitation(
    @Param('reciterSlug') reciterSlug: string,
    @Param('recitationSlug') recitationSlug: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'audio/*' })],
      }),
    )
    audioFiles: Express.Multer.File[],
  ) {
    return this.reciterService.uploadAudioFiles(
      reciterSlug,
      recitationSlug,
      audioFiles,
    );
  }

  @Post('upload-zip')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FilesInterceptor('zip', 1, {
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5 GB
      },
    }),
  )
  uploadZipRecitation(
    @Param('reciterSlug') reciterSlug: string,
    @Param('recitationSlug') recitationSlug: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'zip' })],
      }),
    )
    zipFile: Express.Multer.File,
  ) {
    return this.reciterService.uploadZipFile(
      reciterSlug,
      recitationSlug,
      zipFile,
    );
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

  @Patch('update/:slug')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
      },
    }),
  )
  updateReciter(
    @Param('slug') slug: string,
    @Body() updateReciterDto: UpdateReciterDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    photo?: Express.Multer.File,
  ) {
    return this.reciterService.updateReciter(slug, updateReciterDto, photo);
  }

  @Delete('delete-reciter/:slug')
  @UseGuards(AuthGuard('jwt'))
  deleteReciter(@Param('slug') reciterSlug: string) {
    return this.reciterService.deleteReciter(reciterSlug);
  }

  @Delete('delete-recitation/:slug')
  @UseGuards(AuthGuard('jwt'))
  deleteRecitation(
    @Param('slug') reciterSlug: string,
    @Query() query: QueryType,
  ) {
    return this.reciterService.deleteRecitation(reciterSlug, query);
  }

  @Delete('delete-surah/:slug')
  @UseGuards(AuthGuard('jwt'))
  deleteSurah(@Param('slug') reciterSlug: string, @Query() query: QueryType) {
    return this.reciterService.deleteSurah(reciterSlug, query);
  }

  @Get('missing-download-urls')
  getRecitersWithMissingDownloadURLs() {
    return this.reciterService.getRecitersWithMissingDownloadURLs();
  }
}

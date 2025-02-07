import { Module } from '@nestjs/common';
import { SurahService } from './surah.service';
import { SurahController } from './surah.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Surah, SurahSchema } from './surah.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Surah.name,
        schema: SurahSchema,
      },
    ]),
  ],
  controllers: [SurahController],
  providers: [SurahService],
})
export class SurahModule {}

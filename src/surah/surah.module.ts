import { Module } from '@nestjs/common';
import { SurahService } from './surah.service';
import { SurahController } from './surah.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Surah, SurahSchema } from './surah.schema';
import { Reciter, ReciterSchema } from 'src/reciter/reciter.schema';
import { Recitation, RecitationSchema } from 'src/recitation/recitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Surah.name,
        schema: SurahSchema,
      },
      {
        name: Reciter.name,
        schema: ReciterSchema,
      },
      {
        name: Recitation.name,
        schema: RecitationSchema,
      },
    ]),
  ],
  controllers: [SurahController],
  providers: [SurahService],
})
export class SurahModule {}

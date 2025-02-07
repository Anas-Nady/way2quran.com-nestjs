import { Module } from '@nestjs/common';
import { ReciterService } from './reciter.service';
import { ReciterController } from './reciter.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reciter, ReciterSchema } from './reciter.schema';
import { Surah, SurahSchema } from 'src/surah/surah.schema';
import { Recitation, RecitationSchema } from 'src/recitation/recitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Reciter.name,
        schema: ReciterSchema,
      },
      {
        name: Recitation.name,
        schema: RecitationSchema,
      },
      {
        name: Surah.name,
        schema: SurahSchema,
      },
    ]),
  ],
  controllers: [ReciterController],
  providers: [ReciterService],
  exports: [MongooseModule],
})
export class ReciterModule {}

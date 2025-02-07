import { Module } from '@nestjs/common';
import { MushafController } from './mushaf.controller';
import { MushafService } from './mushaf.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Mushaf, MushafSchema } from './mushaf.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mushaf.name, schema: MushafSchema }]),
  ],
  controllers: [MushafController],
  providers: [MushafService],
})
export class MushafModule {}

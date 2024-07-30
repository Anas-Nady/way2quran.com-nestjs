import { Module } from '@nestjs/common';
import { RecitationService } from './recitation.service';
import { RecitationController } from './recitation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Recitation, RecitationSchema } from './recitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recitation.name, schema: RecitationSchema },
    ]),
  ],
  controllers: [RecitationController],
  providers: [RecitationService],
})
export class RecitationModule {}

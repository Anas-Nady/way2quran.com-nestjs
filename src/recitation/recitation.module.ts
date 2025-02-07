import { Module } from '@nestjs/common';
import { RecitationService } from './recitation.service';
import { RecitationController } from './recitation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RecitationSchema } from './recitation.schema';
import { ReciterService } from '../reciter/reciter.service';
import { ReciterModule } from 'src/reciter/reciter.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Recitations', schema: RecitationSchema },
    ]),
    ReciterModule,
  ],
  controllers: [RecitationController],
  providers: [RecitationService, ReciterService],
})
export class RecitationModule {}

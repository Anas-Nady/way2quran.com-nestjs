import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
import { Recitation } from 'src/recitation/recitation.schema';
import { Surah } from 'src/surah/surah.schema';

@Schema({ timestamps: true })
export class Reciter {
  @Prop({ unique: true, index: true })
  number: number;

  @Prop({ required: true, trim: true })
  arabicName: string;

  @Prop({ required: true, trim: true })
  englishName: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop()
  photo: string;

  @Prop()
  recitations: ReciterRecitation[];

  @Prop({ default: false })
  isTopReciter: boolean;

  @Prop({ default: 0 })
  totalViewers: number;

  @Prop({ default: 0 })
  totalRecitations: number;
}

export class ReciterRecitation {
  @Prop({ ref: Recitation.name, required: true })
  recitationInfo: ObjectId;

  audioFiles: AudioFile[];

  isCompleted: boolean;

  @Prop({ default: 0 })
  totalDownloads: number;
}

export class AudioFile {
  @Prop({ ref: Surah.name, required: true })
  surahInfo: ObjectId;

  @Prop({ required: true })
  surahNumber: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  downloadUrl: string;
}

export const ReciterSchema = SchemaFactory.createForClass(Reciter);

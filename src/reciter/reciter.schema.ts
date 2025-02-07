import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId, Types } from 'mongoose';
import { Recitation } from 'src/recitation/recitation.schema';
import { Surah } from 'src/surah/surah.schema';

@Schema({ timestamps: true })
export class Reciter {
  @Prop({ type: Number, unique: true, index: true })
  number: number;

  @Prop({ type: String, required: true, trim: true })
  arabicName: string;

  @Prop({ type: String, required: true, trim: true })
  englishName: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  slug: string;

  @Prop({ type: String })
  photo: string;

  @Prop()
  recitations: ReciterRecitation[];

  @Prop({ type: Boolean, default: false })
  isTopReciter: boolean;

  @Prop({ type: Number, default: 0 })
  totalViewers: number;

  @Prop({ type: Number, default: 0 })
  totalRecitations: number;
}

export class ReciterRecitation {
  @Prop({ type: Types.ObjectId, ref: Recitation.name, required: true })
  recitationInfo: ObjectId;

  audioFiles: AudioFile[];

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ default: 0 })
  totalDownloads: number;

  @Prop({ type: String })
  downloadURL: string;
}

export class AudioFile {
  @Prop({ type: Types.ObjectId, ref: Surah.name, required: true })
  surahInfo: ObjectId;

  @Prop({ required: true })
  surahNumber: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  downloadUrl: string;
}

export const ReciterSchema = SchemaFactory.createForClass(Reciter);

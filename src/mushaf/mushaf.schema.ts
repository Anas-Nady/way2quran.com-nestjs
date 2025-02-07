import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Mushaf extends Document {
  @Prop({ type: String, required: true })
  arabicName: string;

  @Prop({ type: String, required: true })
  englishName: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true, unique: true })
  downloadURL: string;

  @Prop({ type: String, required: true })
  imageURL: string;

  @Prop({ type: Number, required: true })
  totalDownloads: number;
}

export const MushafSchema = SchemaFactory.createForClass(Mushaf);

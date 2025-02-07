import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Recitation {
  @Prop({ type: String, required: true })
  arabicName: string;

  @Prop({ type: String, required: true })
  englishName: string;

  @Prop({ type: String, required: true, index: true })
  slug: string;

  @Prop({ type: Number, default: 0 })
  totalListeners: number;
}

export const RecitationSchema = SchemaFactory.createForClass(Recitation);

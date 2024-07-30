import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Recitation {
  @Prop()
  arabicName: string;

  @Prop()
  englishName: string;

  @Prop({ index: true })
  slug: string;

  @Prop({ default: 0 })
  totalListeners: number;
}

export const RecitationSchema = SchemaFactory.createForClass(Recitation);

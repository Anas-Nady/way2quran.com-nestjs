import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Surah {
  @Prop({ type: Number, required: true, index: true })
  number: number;

  @Prop({ type: String, required: true })
  arabicName: string;

  @Prop({ type: String, required: true })
  englishName: string;

  @Prop({ type: String, required: true, index: true })
  slug: string;

  @Prop({ default: 0 })
  verses: Verse[];

  @Prop({ type: Number, required: true })
  pageNumber: number;
}

export class Verse {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true })
  textArabic: string;

  @Prop({ type: String, required: true })
  textEnglish: string;
}

export const SurahSchema = SchemaFactory.createForClass(Surah);

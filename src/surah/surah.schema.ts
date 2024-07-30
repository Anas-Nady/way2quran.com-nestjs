import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Surah {
  @Prop({ required: true, index: true })
  number: number;

  @Prop()
  arabicName: string;

  @Prop()
  englishName: string;

  @Prop({ index: true })
  slug: string;

  @Prop({ default: 0 })
  verses: Verse[];
}

export class Verse {
  @Prop()
  id: number;

  @Prop()
  textArabic: string;

  @Prop()
  textEnglish: string;
}

export const SurahSchema = SchemaFactory.createForClass(Surah);

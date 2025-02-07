import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Surah, Verse } from './surah.schema';
import { Model } from 'mongoose';

export interface SurahInfo {
  number: number;
  arabicName: string;
  englishName: string;
  slug: string;
  url: string;
  downloadUrl: string;
  verses: Verse[];
}

@Injectable()
export class SurahService {
  constructor(@InjectModel(Surah.name) private Surah: Model<Surah>) {}

  async getSurahInfo(slug: string, selectedFields?: string) {
    const fields = `arabicName englishName slug number ${selectedFields}`;

    const surah = await this.Surah.findOne({ slug }).select(fields);

    if (!surah) {
      throw new NotFoundException(
        `Surah with this name: ${slug} is not found.`,
      );
    }

    const surahNumber = surah.number;
    let previousSurah: SurahInfo | null;
    let nextSurah: SurahInfo | null;

    if (surahNumber > 1) {
      previousSurah = await this.Surah.findOne({
        number: surahNumber - 1,
      }).select(fields);
    }
    if (surahNumber < 144) {
      nextSurah = await this.Surah.findOne({ number: surahNumber + 1 }).select(
        fields,
      );
    }

    return {
      status: 'success',
      surah,
      previousSurah,
      nextSurah,
    };
  }

  async findAll() {
    const surahs = await this.Surah.find({});

    if (surahs.length === 0) {
      throw new NotFoundException('No surahs found.');
    }

    return {
      status: 'success',
      surahs,
    };
  }
}

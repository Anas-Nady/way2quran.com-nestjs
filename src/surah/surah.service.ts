import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Surah, Verse } from './surah.schema';
import { Model } from 'mongoose';
import { Recitation } from 'src/recitation/recitation.schema';
import { Reciter } from 'src/reciter/reciter.schema';

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
  constructor(
    @InjectModel(Surah.name) private Surah: Model<Surah>,
    @InjectModel(Recitation.name) private Recitation: Model<Recitation>,
    @InjectModel(Reciter.name) private Reciter: Model<Reciter>,
  ) {}

  async getSurahInfo(slug: string) {
    const surah = await this.Surah.findOne({ slug }).select(
      'number arabicName englishName slug',
    );

    if (!surah) {
      throw new NotFoundException(
        `Surah with this name: ${slug} is not found.`,
      );
    }

    return {
      status: 'success',
      surah,
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

  async getSurahWithReciter(
    reciterSlug: string,
    recitationSlug: string,
    surahSlug: string,
  ) {
    const isSurahExits = await this.Surah.findOne({ slug: surahSlug });
    if (!isSurahExits) {
      throw new NotFoundException(
        `Surah with this name: ${surahSlug} is not found.`,
      );
    }

    const isRecitationExists = await this.Recitation.findOne({
      slug: recitationSlug,
    });
    if (!isRecitationExists) {
      throw new NotFoundException(
        `Recitation with this name: ${recitationSlug} is not found.`,
      );
    }

    const filter = {
      slug: reciterSlug,
      'recitations.recitationInfo': isRecitationExists._id,
      'recitations.audioFiles.surahInfo': isSurahExits._id,
    };
    const reciter = await this.Reciter.findOne(filter);
    if (!reciter) {
      throw new NotFoundException(
        `The reciter: ${reciterSlug} is not found. or does not has ${recitationSlug}/${surahSlug}.`,
      );
    }

    const surahInfo: SurahInfo = { ...isSurahExits.toObject() };

    const recitation = reciter.recitations.find(
      (rec) =>
        rec.recitationInfo.toString() === isRecitationExists._id.toString(),
    );

    const audioFile = recitation.audioFiles.find(
      (file) => file.surahInfo.toString() === isSurahExits._id.toString(),
    );

    surahInfo.url = audioFile.url;
    surahInfo.downloadUrl = audioFile.downloadUrl;

    return {
      status: 'success',
      surahInfo,
    };
  }
}

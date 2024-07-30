import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Recitation } from './recitation.schema';
import { Model } from 'mongoose';

@Injectable()
export class RecitationService {
  constructor(
    @InjectModel(Recitation.name) private Recitation: Model<Recitation>,
  ) {}

  async findAll() {
    const recitations = await this.Recitation.find({});

    if (recitations.length === 0) {
      throw new NotFoundException('No recitations found.');
    }
    return {
      status: 'success',
      recitations,
    };
  }

  async findOne(slug: string) {
    try {
      const found = await this.Recitation.findOne({ slug: slug });

      if (!found) {
        throw new NotFoundException(
          `Recitation with this name: ${slug} is not found.`,
        );
      }

      return {
        status: 'success',
        recitation: found,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to find ${slug}: ${error.message}`,
        error.status,
      );
    }
  }
}

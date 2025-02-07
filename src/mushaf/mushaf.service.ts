import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Mushaf } from './mushaf.schema';
import { Model } from 'mongoose';
@Injectable()
export class MushafService {
  constructor(@InjectModel(Mushaf.name) private mushafModel: Model<Mushaf>) {}

  async incrementDownloadCount(mushafSlug: string) {
    const mushaf = await this.mushafModel.findOne({ slug: mushafSlug });
    if (!mushaf) {
      return new HttpException('Mushaf not found', 404);
    }
    mushaf.totalDownloads++;
    await mushaf.save();
    return { success: true };
  }

  async getAllMushafs() {
    return await this.mushafModel.find({}).sort('-totalDownloads');
  }
}

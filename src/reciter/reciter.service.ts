import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReciterDto } from './dto/create-reciter.dto';
import { UpdateReciterDto } from './dto/update-reciter.dto';
import { InjectModel } from '@nestjs/mongoose';
import { AudioFile, Reciter } from './reciter.schema';
import type { Model } from 'mongoose';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import type { Query, Response } from 'express-serve-static-core';
import { Recitation } from 'src/recitation/recitation.schema';
import { Surah } from 'src/surah/surah.schema';
import * as archiver from 'archiver';
import {
  completedRecitations,
  hafsAnAsim,
  recitationsFilter,
  searchQuery,
  sortQuery,
  variousRecitations,
} from './query.builder';

@Injectable()
export class ReciterService {
  private readonly storage: Storage;
  private readonly bucketName = process.env.BUCKET_NAME;
  private readonly defaultReciterPhoto = `imgs/small-logo.svg`;
  private readonly gcsBaseUrl = 'https://storage.googleapis.com';
  private readonly keyFilePath = path.join(
    __dirname,
    '../../cloud-configuration.json',
  );

  constructor(
    @InjectModel(Reciter.name) private Reciter: Model<Reciter>,
    @InjectModel(Recitation.name) private Recitation: Model<Recitation>,
    @InjectModel(Surah.name) private Surah: Model<Surah>,
  ) {
    this.storage = new Storage({ keyFilename: this.keyFilePath });
  }

  async createReciter(
    createReciterDto: CreateReciterDto,
    photo?: Express.Multer.File,
  ) {
    try {
      let { number } = createReciterDto;

      const { arabicName, englishName } = createReciterDto;

      if (number) {
        const isExists = await this.Reciter.findOne({ number });

        if (isExists)
          throw new BadRequestException(
            'The number is already exists with another reciter.',
          );
      } else {
        const maxNumber = await this.Reciter.find()
          .sort({ number: -1 })
          .limit(1);

        if (maxNumber.length > 0) number = maxNumber[0].number + 1;
      }
      const newReciter = await this.Reciter.create({
        arabicName,
        englishName,
        number,
      });

      if (!newReciter) {
        throw new BadRequestException('Failed to create new reciter.');
      }

      if (photo) {
        const fileExtension = photo.originalname.split('.').pop();
        const fileName = `imgs/${newReciter.slug}.${fileExtension}`;
        const file = this.storage.bucket(this.bucketName).file(fileName);

        try {
          await file.save(photo.buffer, {
            metadata: {
              contentType: photo.mimetype,
            },
            public: true,
            gzip: true,
          });
        } catch (error) {
          throw new HttpException(
            `Failed to save photo to Cloud Storage: ${error.message}`,
            error.status,
          );
        }

        newReciter.photo = `${this.gcsBaseUrl}/${this.bucketName}/${fileName}`;
      } else {
        newReciter.photo = `${this.gcsBaseUrl}/${this.bucketName}/${this.defaultReciterPhoto}`;
      }

      await newReciter.save();

      return {
        message: 'Reciter created successfully.',
        reciter: newReciter,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create new reciter: ${error.message}`,
        error.status,
      );
    }
  }

  async uploadRecitation(query: Query, audioFiles: Express.Multer.File[]) {
    try {
      const reciterSlug = query.reciterSlug as string;
      const recitationSlug = query.recitationSlug as string;

      if (!recitationSlug) {
        throw new BadRequestException(`Please provide a recitation's slug`);
      }

      if (!reciterSlug) {
        throw new BadRequestException(`Please provide a reciter's slug`);
      }

      if (!audioFiles || audioFiles.length === 0) {
        throw new BadRequestException('Please upload audio files.');
      }

      const reciter = await this.Reciter.findOne({ slug: reciterSlug });
      if (!reciter) {
        throw new NotFoundException(`this reciter: ${reciterSlug} not found.`);
      }

      const isRecitationFound = await this.Recitation.findOne({
        slug: recitationSlug,
      });
      if (!isRecitationFound) {
        throw new NotFoundException(
          `this recitationSlug: ${recitationSlug} is invalid. Please choose another one.`,
        );
      }

      let recitationToUpdate;
      const recitationIndex = reciter.recitations.findIndex(
        (rec) =>
          rec.recitationInfo.toString() === isRecitationFound._id.toString(),
      );

      // if the selected recitation is already exist, update it.
      if (recitationIndex >= 0) {
        recitationToUpdate = reciter.recitations[recitationIndex];
      } else {
        recitationToUpdate = {
          recitationInfo: isRecitationFound._id,
          audioFiles: [],
          isCompleted: false,
          totalDownloads: 0,
        };
      }

      // upload audio files to google cloud storage
      for (const audioFile of audioFiles) {
        const fileName = `${reciterSlug}/${recitationSlug}/${audioFile.originalname}`;
        const surahNumber = audioFile.originalname.split('.')[0];
        const audioPattern = /\b\d{3}\.[a-zA-Z0-9]+\b/;
        const isSurahNumberValid = audioPattern.test(surahNumber);

        if (!isSurahNumberValid) {
          throw new BadRequestException(
            `Invalid surah number: ${audioFile.originalname}`,
          );
        }

        const isSurahExists = recitationToUpdate.audioFiles.some(
          (surah: AudioFile) => surah.surahNumber === parseInt(surahNumber),
        );

        // ignore this file if its exist in the recitation.
        if (isSurahExists) continue;

        // upload file if not already uploaded
        const file = this.storage.bucket(this.bucketName).file(fileName);
        try {
          await file.save(audioFile.buffer, {
            metadata: {
              contentType: audioFile.mimetype,
            },
            public: true,
          });

          // add the uploaded file to recitationToUpdate array.
          recitationToUpdate.audioFiles.push({
            surah: surahNumber,
            url: `${this.gcsBaseUrl}/${this.bucketName}/${fileName}`,
            downloadUrl: file.metadata.mediaLink,
          });
        } catch (error) {
          throw new HttpException(
            `Failed to save ${audioFile.originalname} to Cloud Storage: ${error.message}`,
            error.status,
          );
        }
      }

      // Sort audio files based on surah's number after upload them.
      recitationToUpdate.audioFiles.sort(
        (a: AudioFile, b: AudioFile) => a.surahNumber - b.surahNumber,
      );

      if (recitationToUpdate.audioFiles.length === 114) {
        recitationToUpdate.isCompleted = true;
      }

      // save uploaded recitation to MongoDB
      if (recitationIndex >= 0) {
        reciter.recitations[recitationIndex] = recitationToUpdate;
      } else {
        reciter.recitations.push(recitationToUpdate);
        reciter.totalRecitations += 1;
      }
      await reciter.save();

      return {
        message: `The recitation: ${recitationSlug} has been uploaded successfully.`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to upload recitation: ${error.message}`,
        error.status,
      );
    }
  }

  async findAll(query: Query) {
    try {
      const recitationSlug = query.recitationSlug as string;

      let recitation;
      if (
        recitationSlug === variousRecitations ||
        recitationSlug === completedRecitations
      ) {
        recitation = await this.Recitation.findOne({ slug: hafsAnAsim });
      } else {
        recitation = await this.Recitation.findOne({ slug: recitationSlug });
      }

      const recitationFilter = recitationsFilter(
        recitationSlug,
        recitation?._id,
      );

      // handle sort
      const sortBy = sortQuery(query.sort as string);

      let isTopReciters: { isTopReciter: string };
      if (query.isTopReciter === 'true' || query.isTopReciter === 'false') {
        isTopReciters = { isTopReciter: query.isTopReciter };
      }

      // handle search query
      const search = searchQuery(query.search as string);

      // Handle pagination
      const currentPage = Number(query.currentPage) || 1;
      const pageSize = Number(query.pageSize) || 50;

      const skip = (currentPage - 1) * pageSize;

      const totalReciters = await this.Reciter.countDocuments({
        ...search,
        ...recitationFilter,
        ...isTopReciters,
      });
      const reciters = await this.Reciter.find({
        ...search,
        ...recitationFilter,
        ...isTopReciters,
      })
        .select('-recitations')
        .limit(pageSize)
        .skip(skip)
        .sort(sortBy);

      return {
        reciters,
        pagination: {
          currentPage,
          totalPages: Math.ceil(totalReciters / pageSize),
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get reciters: ${error.message}.`,
        error.status,
      );
    }
  }

  async getReciterInfo(slug: string) {
    try {
      const reciter = await this.Reciter.findOne({ slug }).select(
        'arabicName englishName photo slug',
      );

      if (!reciter) {
        throw new NotFoundException(
          `This reciter with name: ${slug} not found.`,
        );
      }

      return { status: 'success', reciter };
    } catch (error) {
      throw new HttpException(
        `Failed to get reciter with name: ${slug}, ${error.message}`,
        error.status,
      );
    }
  }

  async getReciterDetails(slug: string, query: Query) {
    try {
      const recitationSlug = query.recitationSlug;

      if (!recitationSlug) {
        throw new BadRequestException(`Please provide recitation's slug`);
      }

      const reciter = await this.Reciter.findOne({ slug })
        .populate({
          path: 'recitations.recitationInfo',
          model: Recitation.name,
        })
        .populate({
          path: 'recitations.audioFiles.surahInfo',
          model: Surah.name,
          select: '-verses',
        });

      if (!reciter)
        throw new NotFoundException(
          `This reciter with name: ${slug} not found. or does not has /${recitationSlug}`,
        );

      reciter.totalViewers++;
      await reciter.save();

      return {
        reciter,
        recitations: reciter.recitations,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get reciter details: ${error.message}`,
        error.status,
      );
    }
  }

  async updateReciter(
    slug: string,
    updateReciterDto: UpdateReciterDto,
    photo?: Express.Multer.File,
  ) {
    try {
      const reciter = await this.Reciter.findOne({ slug });

      if (!reciter) {
        throw new NotFoundException(
          `This reciter with name: ${slug} not found.`,
        );
      }

      // update reciter's photo if admin upload image
      if (photo) {
        const fileExtension = photo.originalname.split('.').pop();
        const fileName = `imgs/${reciter.slug}.${fileExtension}`;
        const file = this.storage.bucket(this.bucketName).file(fileName);

        try {
          await file.save(photo.buffer, {
            metadata: {
              contentType: photo.mimetype,
            },
            public: true,
            gzip: true,
          });
          reciter.photo = `${this.gcsBaseUrl}/${this.bucketName}/${fileName}`;
          await reciter.save();
        } catch (error) {
          throw new HttpException(
            `Failed to save photo to Cloud Storage: ${error.message}`,
            error.status,
          );
        }
      } else {
        reciter.photo = `${this.gcsBaseUrl}/${this.bucketName}/${this.defaultReciterPhoto}`;
        await reciter.save();
      }
      reciter.number = updateReciterDto.number || reciter.number;
      reciter.arabicName = updateReciterDto.arabicName || reciter.arabicName;
      reciter.englishName = updateReciterDto.englishName || reciter.englishName;
      reciter.isTopReciter =
        updateReciterDto.isTopReciter || reciter.isTopReciter;
      await reciter.save();
      return { message: 'Reciter updated successfully.' };
    } catch (error) {
      throw new HttpException(
        `Failed to update reciter: ${error.message}`,
        error.status,
      );
    }
  }

  async downloadRecitation(
    reciterSlug: string,
    recitationSlug: string,
    res: Response,
  ) {
    const folderPath = `${reciterSlug}/${recitationSlug}`;

    try {
      if (!recitationSlug) {
        throw new BadRequestException(
          `Please provide recitation's slug to download it.`,
        );
      }
      const reciter = await this.Reciter.findOne({ slug: reciterSlug });
      if (!reciter) {
        throw new NotFoundException(
          `No reciter found with the reciterSlug: ${reciterSlug}`,
        );
      }

      const recitation = await this.Recitation.findOne({
        slug: recitationSlug,
      });

      const recitationFound = reciter.recitations?.find(
        (rec) => rec.recitationInfo.toString() === recitation._id.toString(),
      );

      if (!recitationFound) {
        throw new NotFoundException(
          `The reciter doesn't have this recitation: ${recitationSlug}`,
        );
      }

      // Initialize archiver
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.pipe(res);

      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: folderPath });

      // Filter files based on the folder structure
      const filteredFiles = files.filter((file) =>
        file.name.startsWith(`${folderPath}/`),
      );

      if (filteredFiles.length === 0) {
        throw new NotFoundException(
          `No files found in Google Storage under the path: ${folderPath}`,
        );
      }

      filteredFiles.forEach((file) => {
        const fileReadStream = this.storage
          .bucket(this.bucketName)
          .file(file.name)
          .createReadStream();
        archive.append(fileReadStream, {
          name: file.name.replace(`${folderPath}/`, ''),
        });
      });

      const zipFileName = `${folderPath}.zip`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${zipFileName}"`,
      );
      archive.finalize();
    } catch (error) {
      throw new HttpException(
        `Failed to download ${folderPath}. ${error.message}`,
        error.status,
      );
    }
  }

  async removeReciter(slug: string) {
    try {
      const reciter = await this.Reciter.findOne({ slug });

      if (!reciter) {
        throw new NotFoundException(`No reciter found with the slug: ${slug}`);
      }

      const photoPath = reciter.photo?.split(`${this.bucketName}/`)[1];
      if (photoPath !== this.defaultReciterPhoto) {
        const isPhotoExists = this.storage
          .bucket(this.bucketName)
          .file(photoPath);

        if (isPhotoExists) await isPhotoExists.delete();
      }

      // Delete from Google Storage
      const folderPath = `${slug}`;
      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: folderPath });

      if (files.length === 0) {
        throw new NotFoundException(
          `No files found in Google Storage under the path: ${folderPath}`,
        );
      }

      await Promise.all(
        files.map((file) =>
          this.storage.bucket(this.bucketName).file(file.name).delete(),
        ),
      );

      // Delete from MongoDB
      await reciter.deleteOne();

      return { message: `Reciter removed successfully.` };
    } catch (error) {
      throw new HttpException(
        `Failed to remove the reciter.: ${error.message}`,
        error.status,
      );
    }
  }

  async removeRecitation(slug: string, query: Query) {
    try {
      const recitationSlug = query.recitationSlug;

      if (!recitationSlug) {
        throw new BadRequestException(
          `Please provide a recitation's slug. to remove it`,
        );
      }

      const recitation = await this.Recitation.findOne({
        slug: recitationSlug,
      });

      const reciter = await this.Reciter.findOne({
        slug,
        'recitations.recitationInfo': recitation._id,
      });

      if (!reciter) {
        throw new NotFoundException(
          `This resource: /${slug}/${recitationSlug} not found.`,
        );
      }

      // delete from Google Storage
      const folderPath = `${slug}/${recitationSlug}`;
      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: folderPath });

      if (files.length === 0) {
        throw new NotFoundException(
          `No audio files found under the path: ${folderPath}`,
        );
      }

      await Promise.all(
        files.map((file) =>
          this.storage.bucket(this.bucketName).file(file.name).delete(),
        ),
      );

      // delete from MongoDB
      reciter.recitations = reciter.recitations.filter(
        (rec) => rec.recitationInfo.toString() !== recitation._id.toString(),
      );
      reciter.totalRecitations -= 1;

      await reciter.save();

      return { message: 'The recitation removed successfully.' };
    } catch (error) {
      throw new HttpException(
        `Failed to remove the recitation.: ${error.message}`,
        error.status,
      );
    }
  }

  async removeSurah(slug: string, query: Query) {
    try {
      const recitationSlug = query.recitationSlug;
      const surahNumber = query.surahNumber;

      if (!recitationSlug) {
        throw new BadRequestException(`Please provide a recitation's slug.`);
      }
      if (!surahNumber) {
        throw new BadRequestException(
          `Please provide a surah's number to remove it.`,
        );
      }

      const recitation = await this.Recitation.findOne({
        slug: recitationSlug,
      });
      if (!recitation) {
        throw new NotFoundException(
          `No recitation found with the slug: ${recitationSlug}`,
        );
      }

      const surah = await this.Surah.findOne({ number: surahNumber });
      if (!surah) {
        throw new NotFoundException(
          `No surah found with the number: ${surahNumber}`,
        );
      }

      const reciter = await this.Reciter.findOne({
        slug,
        'recitations.recitationInfo': recitation._id,
        'recitations.audioFiles.surahInfo': surah._id,
      });

      if (!reciter) {
        throw new NotFoundException(
          `This resource: /${slug}/${recitationSlug}/${surahNumber} not found.`,
        );
      }

      // Delete surah from google storage
      const filePath = `${slug}/${recitationSlug}/${surahNumber}`;

      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: filePath });

      if (files.length === 0) {
        throw new NotFoundException(`No audio file found under: ${filePath}.`);
      }

      await Promise.all(
        files.map((file) =>
          this.storage.bucket(this.bucketName).file(file.name).delete(),
        ),
      );

      // Delete surah from MongoDB
      reciter.recitations.map((recitation) =>
        recitation.audioFiles.filter(
          (audioFile) =>
            audioFile.surahInfo.toString() !== surah._id.toString(),
        ),
      );

      await reciter.save();

      return { message: 'Surah deleted successfully.' };
    } catch (error) {
      throw new HttpException(
        `Failed to remove the Surah.: ${error.message}`,
        error.status,
      );
    }
  }
}

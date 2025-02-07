import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
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
import * as fs from 'fs';
import slugify from 'slugify';

@Injectable()
export class ReciterService {
  private readonly storage: Storage;
  private readonly bucketName = process.env.BUCKET_NAME;
  private readonly gcsBaseUrl = 'https://storage.googleapis.com';
  private readonly keyFilePath = path.join(__dirname, '../../gcs.json');
  private readonly defaultReciterPhoto = `${this.gcsBaseUrl}/${this.bucketName}/imgs/small-logo.svg`;

  constructor(
    @InjectModel(Reciter.name) private Reciter: Model<Reciter>,
    @InjectModel(Recitation.name) private Recitation: Model<Recitation>,
    @InjectModel(Surah.name) private Surah: Model<Surah>,
  ) {
    this.storage = new Storage({ keyFilename: this.keyFilePath });
  }

  // Helper method to validate if the reciter number already exists
  private async validateReciterNumber(number: number): Promise<void> {
    if (number <= 0)
      throw new BadRequestException(
        `The number can not be less than or equals zero.`,
      );
    const isExists = await this.Reciter.findOne({ number }).exec();
    if (isExists) {
      throw new BadRequestException(
        'The number is already associated with another reciter.',
      );
    }
  }

  // Helper method to generate the next available reciter number
  private async generateNextReciterNumber(): Promise<number> {
    const maxNumberReciter = await this.Reciter.find()
      .sort({ number: -1 })
      .limit(1)
      .exec();

    return maxNumberReciter.length > 0 ? maxNumberReciter[0].number + 1 : 1;
  }

  // Helper method to upload a file to Google Cloud Storage
  private async uploadFileToGCS(
    fileToUpload: Express.Multer.File,
    folderName: string,
    fileName: string,
  ): Promise<{ publicURL: string; downloadURL: string }> {
    const fileExtension = fileToUpload.originalname.split('.').pop();
    const filePath = `${folderName}/${fileName}.${fileExtension}`;
    const file = this.storage.bucket(this.bucketName).file(filePath);

    try {
      const readableStream = fs.createReadStream(fileToUpload.path);
      await new Promise((resolve, reject) => {
        readableStream
          .pipe(
            file.createWriteStream({
              metadata: {
                contentType: fileToUpload.mimetype,
              },
              public: true,
              resumable: true,
            }),
          )
          .on('error', (error) => reject(error))
          .on('finish', () => resolve(null));
      });

      // Delete the temporary file after upload
      fs.unlink(fileToUpload.path, (err) => {
        if (err) {
          console.error('Failed to delete temporary file:', err);
        }
      });

      return {
        publicURL: `${this.gcsBaseUrl}/${this.bucketName}/${fileName}`,
        downloadURL: file.metadata.mediaLink,
      };
    } catch (error) {
      fs.unlink(fileToUpload.path, (err) => {
        if (err) {
          console.error('Failed to delete temporary file:', err);
        }
      });
      throw new InternalServerErrorException(
        `Failed to upload file to Google Cloud Storage: ${error.message}`,
      );
    }
  }

  async createReciter(
    createReciterDto: CreateReciterDto,
    photo?: Express.Multer.File,
  ) {
    try {
      let number = createReciterDto.number;

      const { arabicName, englishName } = createReciterDto;

      // Check if the number is already taken

      if (number) {
        await this.validateReciterNumber(number);
      } else {
        number = await this.generateNextReciterNumber();
      }
      const slug = slugify(englishName, { lower: true });

      const isSlugExists = await this.Reciter.findOne({ slug });
      if (isSlugExists) {
        throw new BadRequestException(
          `This reciter with name: ${englishName} already exists.`,
        );
      }

      const newReciter = await this.Reciter.create({
        arabicName,
        englishName,
        slug,
        number,
      });

      if (!newReciter) {
        throw new BadRequestException('Failed to create new reciter.');
      }

      // Handle photo upload if provided
      if (photo) {
        try {
          const uploadPhoto = await this.uploadFileToGCS(
            photo,
            'imgs',
            newReciter.slug,
          );
          newReciter.photo = uploadPhoto.publicURL;
        } catch (error) {
          // Fallback to default photo if upload fails
          newReciter.photo = this.defaultReciterPhoto;
          await newReciter.save();

          throw new HttpException(
            `Failed to save photo to Cloud Storage: ${error.message}`,
            error.status || 500,
          );
        }
      } else {
        newReciter.photo = this.defaultReciterPhoto;
      }

      await newReciter.save();

      return {
        message: 'Reciter created successfully.',
        reciter: newReciter,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        `Failed to create new reciter: ${error.message}`,
        error.status,
      );
    }
  }

  async uploadAudioFiles(
    reciterSlug: string,
    recitationSlug: string,
    audioFiles: Express.Multer.File[],
  ) {
    try {
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
        const surahNumber = audioFile.originalname.split('.')[0];

        const isSurahNumberValid =
          parseInt(surahNumber) >= 1 && parseInt(surahNumber) <= 144;

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
        try {
          const uploadAudioFile = await this.uploadFileToGCS(
            audioFile,
            `${reciterSlug}/${recitationSlug}`,
            audioFile.originalname.split('.')[0],
          );

          const currentSurah = await this.Surah.findOne({
            number: surahNumber,
          });

          // add the uploaded file to recitationToUpdate array.
          recitationToUpdate.audioFiles.push({
            surahInfo: currentSurah._id,
            surahNumber,
            url: uploadAudioFile.publicURL,
            downloadUrl: uploadAudioFile.downloadURL,
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

  async uploadZipFile(
    reciterSlug: string,
    recitationSlug: string,
    zipFile: Express.Multer.File,
  ) {
    try {
      const reciter = await this.Reciter.findOne({
        slug: reciterSlug,
      });
      if (!reciter) {
        throw new NotFoundException(`This reciter: ${reciterSlug} not found.`);
      }

      const isRecitationExists = await this.Recitation.findOne({
        slug: recitationSlug,
      });
      if (!isRecitationExists) {
        throw new NotFoundException(
          `This recitation: ${recitationSlug} not found.`,
        );
      }

      const isReciterHasRecitation = reciter.recitations.some(
        (rec) =>
          rec.recitationInfo.toString() === isRecitationExists._id.toString(),
      );
      if (!isReciterHasRecitation) {
        throw new NotFoundException(
          `This reciter: ${reciterSlug} doesn't have this recitation: ${recitationSlug}`,
        );
      }

      try {
        const uploadZip = await this.uploadFileToGCS(
          zipFile,
          'zip-files',
          `${reciterSlug}/${recitationSlug}`,
        );

        // save downloadURL to the selected recitation in MongoDB
        const recitationIndex = reciter.recitations.findIndex(
          (rec) =>
            rec.recitationInfo.toString() === isRecitationExists._id.toString(),
        );
        reciter.recitations[recitationIndex].downloadURL =
          uploadZip.downloadURL;

        await reciter.save();

        return {
          message: `The zip file has been uploaded successfully.`,
          status: 'success',
        };
      } catch (error) {
        throw new HttpException(
          `Failed to save zip file to Cloud Storage: ${error.message}`,
          error.status,
        );
      }
    } catch (error) {
      throw new HttpException('Failed to upload zip file', error.status);
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
      const increaseViews = query.increaseViews === 'true';

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
          `This reciter with name: ${slug} not found.`,
        );

      if (increaseViews) {
        reciter.totalViewers++;
      }
      await reciter.save();

      return {
        message: 'Success',
        reciter,
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

      if (photo) {
        try {
          const uploadPhoto = await this.uploadFileToGCS(
            photo,
            'imgs',
            reciter.slug,
          );
          reciter.photo = uploadPhoto.publicURL;
          await reciter.save();
        } catch (error) {
          throw new HttpException(
            `Failed to save photo to Cloud Storage: ${error.message}`,
            error.status,
          );
        }
      }

      if (updateReciterDto.arabicName) {
        reciter.arabicName = updateReciterDto.arabicName;
      }
      if (updateReciterDto.englishName) {
        reciter.englishName = updateReciterDto.englishName;
      }
      if (!isNaN(updateReciterDto.number)) {
        await this.validateReciterNumber(updateReciterDto.number);
        reciter.number = updateReciterDto.number;
      }

      if (updateReciterDto.isTopReciter) {
        const recitation = await this.Recitation.findOne({ slug: hafsAnAsim });

        const recitationIndex = reciter.recitations.some(
          (rec) => rec.recitationInfo.toString() === recitation._id.toString(),
        );

        if (!recitationIndex) {
          throw new BadRequestException(
            `The reciter must have the recitation: ${hafsAnAsim} to be a top reciter.`,
          );
        }
      }
      reciter.isTopReciter =
        updateReciterDto.isTopReciter || reciter.isTopReciter;
      await reciter.save();
      return { message: 'Reciter updated successfully.', reciter };
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

  async deleteReciter(slug: string) {
    try {
      const reciter = await this.Reciter.findOne({ slug });

      if (!reciter) {
        throw new NotFoundException(`No reciter found with the slug: ${slug}`);
      }

      if (reciter.photo !== this.defaultReciterPhoto) {
        const photoPath = reciter.photo.split(`${this.bucketName}/`)[1];
        try {
          await this.storage.bucket(this.bucketName).file(photoPath)?.delete();
        } catch (error) {
          throw new HttpException(
            `Failed to delete reciter photo: ${error.message}`,
            error.status,
          );
        }
      }

      // Delete all recitations from Google Storage
      const folderPath = `${slug}`;
      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: folderPath });

      if (files.length) {
        await Promise.all(files.map((file) => file.delete()));
      }

      // Delete all ZIP files related to the reciter’s recitations
      if (reciter.recitations.length > 0) {
        await Promise.all(
          reciter.recitations.map(async (rec) => {
            const recitation = await this.Recitation.findById(
              rec.recitationInfo,
            );

            if (recitation) {
              try {
                await this.storage
                  .bucket(this.bucketName)
                  .file(`zip-files/${reciter.slug}/${recitation.slug}.zip`)
                  ?.delete();
              } catch (error) {
                throw new HttpException(
                  `Failed to remove zip file: ${error.message}`,
                  error.status,
                );
              }
            }
          }),
        );
      }

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

  async deleteRecitation(slug: string, query: Query) {
    try {
      const recitationSlug = query.recitationSlug;

      const recitation = await this.Recitation.findOne({
        slug: recitationSlug,
      });

      if (!recitation) {
        throw new NotFoundException(
          `No recitation found with the slug: ${recitationSlug}`,
        );
      }

      const reciter = await this.Reciter.findOne({
        slug,
        'recitations.recitationInfo': recitation._id,
      });

      if (!reciter) {
        throw new NotFoundException(
          `This resource: /${slug}/${recitationSlug} not found.`,
        );
      }

      // Delete audio files
      const folderPath = `${slug}/${recitationSlug}`;

      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: folderPath });

      if (files.length) {
        await Promise.all(files.map((file) => file.delete()));
      }

      // Delete the ZIP file if it exists
      const zipFilePath = `zip-files/${slug}/${recitationSlug}.zip`;
      try {
        await this.storage.bucket(this.bucketName).file(zipFilePath).delete();
      } catch (error) {
        throw new HttpException(
          `Failed to remove ${zipFilePath} from GCS.: ${error.message}`,
          error.status,
        );
      }

      // delete from MongoDB
      reciter.recitations = reciter.recitations.filter(
        (rec) => rec.recitationInfo.toString() !== recitation._id.toString(),
      );
      reciter.totalRecitations = Math.max(0, reciter.totalRecitations - 1);

      await reciter.save();

      return { message: 'The recitation removed successfully.' };
    } catch (error) {
      throw new HttpException(
        `Failed to remove the recitation.: ${error.message}`,
        error.status,
      );
    }
  }

  async deleteSurah(slug: string, query: Query) {
    try {
      const recitationSlug = query.recitationSlug;
      const surahNumber = query.surahNumber;
      const audioName = query.audioName;

      const [recitation, surah] = await Promise.all([
        this.Recitation.findOne({ slug: recitationSlug }),
        this.Surah.findOne({ number: surahNumber }),
      ]);

      if (!recitation) {
        throw new NotFoundException(
          `No recitation found with the slug: ${recitationSlug}`,
        );
      }

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
      const filePath = `${slug}/${recitationSlug}/${audioName}`;

      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({ prefix: filePath });

      try {
        if (files.length) {
          await Promise.all(files.map((file) => file.delete()));
        }
      } catch (error) {
        throw new HttpException(
          `Failed to remove the Surah.: ${error.message}`,
          error.status,
        );
      }

      const recitationEntry = reciter.recitations.find(
        (rec) => rec.recitationInfo.toString() === recitation._id.toString(),
      );

      // remove from mongoDB
      if (recitationEntry) {
        recitationEntry.audioFiles = recitationEntry.audioFiles.filter(
          (audioFile) =>
            audioFile.surahNumber.toString() !== surahNumber.toString(),
        );
      }

      await reciter.save();

      return { message: 'Surah deleted successfully.' };
    } catch (error) {
      throw new HttpException(
        `Failed to remove the Surah.: ${error.message}`,
        error.status,
      );
    }
  }

  async getRecitersWithMissingDownloadURLs() {
    try {
      const reciters = await this.Reciter.aggregate([
        {
          $match: {
            'recitations.recitationInfo': { $exists: true },
          },
        },
        {
          $project: {
            arabicName: 1,
            englishName: 1,
            slug: 1,
            number: 1,
            recitations: {
              $filter: {
                input: '$recitations',
                as: 'recitation',
                cond: {
                  $not: { $ifNull: ['$$recitation.downloadURL', false] },
                },
              },
            },
          },
        },
        {
          $match: {
            'recitations.0': { $exists: true },
          },
        },
        {
          $project: {
            arabicName: 1,
            englishName: 1,
            slug: 1,
            number: 1,
          },
        },
        {
          $sort: {
            arabicName: 1,
          },
        },
      ]);

      return {
        reciters,
        status: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get reciters without downloadURL',
        error.status,
      );
    }
  }

  async getRecitationsWithMissingDownloadURLs(reciterSlug: string) {
    try {
      const recitations = await this.Reciter.aggregate([
        {
          $match: {
            slug: reciterSlug,
          },
        },
        {
          $unwind: '$recitations',
        },
        {
          $match: {
            'recitations.downloadURL': { $exists: false }, // Filter recitations without downloadURL
          },
        },
        {
          $lookup: {
            from: 'recitations', // Lookup the recitation collection using recitationInfo's ObjectId
            localField: 'recitations.recitationInfo',
            foreignField: '_id',
            as: 'recitationDetails', // Output as an array of recitation details
          },
        },
        {
          $unwind: '$recitationDetails', // Unwind the recitationDetails array to access the details directly
        },
        {
          $project: {
            arabicName: '$recitationDetails.arabicName', // Include arabicName from recitationDetails
            englishName: '$recitationDetails.englishName', // Include englishName from recitationDetails
            slug: '$recitationDetails.slug', // Include recitation's slug from recitationDetails
          },
        },
      ]);

      return {
        status: 'success',
        recitations,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to find recitations missing downloadURL: ${error.message}`,
        error.status,
      );
    }
  }
}

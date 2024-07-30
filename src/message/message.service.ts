import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './message.schema';
import { isValidObjectId, Model } from 'mongoose';
import type { Query as QueryType } from 'express-serve-static-core';

@Injectable()
export class MessageService {
  constructor(@InjectModel(Message.name) private Message: Model<Message>) {}

  async createMessage(createMessageDto: CreateMessageDto) {
    let { content } = createMessageDto;
    content = content.replace(/[\r\n]{2,}/g, '<b></b>');

    const message = await this.Message.create({ ...createMessageDto, content });
    if (!message) throw new HttpException('Invalid data input.', 400);

    return { message: 'Thank you. We received your message.' };
  }

  async findAllMessages(query: QueryType) {
    try {
      const messagesPerPage = 6;
      const currentPage = Number(query.currentPage) || 1;

      const skip = (currentPage - 1) * messagesPerPage;

      const results = await this.Message.find({})
        .skip(skip)
        .limit(messagesPerPage)
        .select('-createdAt');

      const countDocuments = await this.Message.countDocuments();

      if (results.length === 0) {
        throw new NotFoundException('No messages found.');
      }

      this.Message.updateMany({}, { $set: { isRead: true } });

      return {
        messages: results,
        pagination: {
          currentPage,
          totalPages: Math.ceil(countDocuments / messagesPerPage),
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get messages: ${error.message}`,
        error.status,
      );
    }
  }

  async deleteMessage(id: string) {
    const isValid = isValidObjectId(id);
    if (!isValid) throw new HttpException('Invalid message ID.', 400);

    const message = await this.Message.findById(id);
    if (!message) throw new NotFoundException('Message not found');

    await message.deleteOne();
    return { message: `Message deleted successfully.` };
  }
}

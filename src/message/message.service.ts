import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './message.schema';
import { Model } from 'mongoose';
import type { Query as QueryType } from 'express-serve-static-core';
import * as nodemailer from 'nodemailer';
import EmailTemplate from './EmailTemplate';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessageService {
  private transporter: nodemailer.Transporter;

  constructor(@InjectModel(Message.name) private Message: Model<Message>) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async createMessage(createMessageDto: CreateMessageDto) {
    let { content } = createMessageDto;
    content = content.replace(/[\r\n]{2,}/g, '<b></b>');

    const slug = `${createMessageDto.senderName}-${Date.now()}`;

    const message = await this.Message.create({
      ...createMessageDto,
      slug,
      content,
    });
    if (!message) throw new HttpException('Invalid data input.', 400);

    return { message: 'Thank you. We received your message.' };
  }

  async findAllMessages(query: QueryType) {
    try {
      const messagesPerPage = Number(query.pageSize) || 6;
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

      await this.Message.updateMany({}, { $set: { isRead: true } });

      return {
        messages: results,
        pagination: {
          totalCount: countDocuments,
          page: currentPage,
          pages: Math.ceil(countDocuments / messagesPerPage),
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get messages: ${error.message}`,
        error.status,
      );
    }
  }

  async getUnreadMessages() {
    const unreadMessages = await this.Message.find({ isRead: false });

    return unreadMessages.length;
  }

  async sendMessageToClient(sendMessageDto: SendMessageDto) {
    const mailOptions = {
      from: `"Way2Quran.com" <${process.env.SMTP_USER}>`,
      to: sendMessageDto.receiverEmail,
      subject: 'Message from Way2Quran.com',
      html: EmailTemplate({ content: sendMessageDto.content }),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.response);
      return { message: 'Email sent successfully.' };
    } catch (error) {
      console.error('Error sending email: ', error);
      throw new HttpException('Error sending email.', 500);
    }
  }

  async deleteMessage(slug: string) {
    const message = await this.Message.findOne({ slug });
    if (!message) throw new NotFoundException('Message not found');

    await message.deleteOne();
    return { message: `Message deleted successfully.` };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Query as QueryType } from 'express-serve-static-core';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('new')
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.createMessage(createMessageDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Query() query: QueryType) {
    return this.messageService.findAllMessages(query);
  }

  @Get('unread')
  @UseGuards(AuthGuard('jwt'))
  findUnread() {
    return this.messageService.getUnreadMessages();
  }

  @Post('send-message')
  @UseGuards(AuthGuard('jwt'))
  sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.messageService.sendMessageToClient(sendMessageDto);
  }

  @Delete('delete/:slug')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('slug') slug: string) {
    return this.messageService.deleteMessage(slug);
  }
}

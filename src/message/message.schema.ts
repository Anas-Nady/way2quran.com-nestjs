import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderEmail: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

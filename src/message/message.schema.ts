import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: String, required: true })
  senderName: string;

  @Prop({ type: String, required: true })
  senderEmail: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

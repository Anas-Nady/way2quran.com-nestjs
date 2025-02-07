import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Visitor extends Document {
  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: String, required: true })
  userAgent: string;

  @Prop({ type: String, required: true })
  visitorId: string;

  @Prop({ type: Date, default: Date.now })
  visitDate: Date;
}

export const VisitorSchema = SchemaFactory.createForClass(Visitor);

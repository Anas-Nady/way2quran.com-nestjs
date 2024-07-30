import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  senderName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  senderEmail: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}

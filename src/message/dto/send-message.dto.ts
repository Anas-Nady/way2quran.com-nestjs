import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  receiverEmail: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}

import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAuthDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  currentEmail: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  newEmail: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  newPassword: string;
}

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReciterDto {
  @IsNumber()
  @IsOptional()
  number?: number;

  @IsNotEmpty()
  @IsString()
  arabicName: string;

  @IsNotEmpty()
  @IsString()
  englishName: string;
}

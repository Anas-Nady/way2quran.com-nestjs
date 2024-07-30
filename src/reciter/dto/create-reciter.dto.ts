import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReciterDto {
  @IsString()
  @IsOptional()
  number: number;

  @IsNotEmpty()
  @IsString()
  arabicName: string;

  @IsNotEmpty()
  @IsString()
  englishName: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  photo: string;

  @IsNotEmpty()
  @IsBoolean()
  isTopReciter: boolean;
}

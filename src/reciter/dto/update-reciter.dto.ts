import { PartialType } from '@nestjs/mapped-types';
import { CreateReciterDto } from './create-reciter.dto';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateReciterDto extends PartialType(CreateReciterDto) {
  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  isTopReciter: boolean;
}

import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function IsRealDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRealDate',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: {
        message: 'birthday must be a valid date in YYYY-MM-DD format',
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const [y, m, d] = value.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          return (
            date.getFullYear() === y &&
            date.getMonth() === m - 1 &&
            date.getDate() === d
          );
        },
      },
    });
  };
}

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum SeekingEnum {
  CASUAL = 'casual',
  RELATIONSHIP = 'relationship',
  FRIENDSHIP = 'friendship',
  PARTY = 'party',
}

export class OnboardingDto {
  @ApiProperty({ enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender!: GenderEnum;

  @ApiProperty({ enum: SeekingEnum })
  @IsEnum(SeekingEnum)
  seeking!: SeekingEnum;

  @ApiProperty({ enum: GenderEnum, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(GenderEnum, { each: true })
  interested_in!: GenderEnum[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  picture_urls?: string[];

  @ApiProperty({ description: 'Date of birth in YYYY-MM-DD format' })
  @IsString()
  @IsRealDate()
  birthday!: string;
}

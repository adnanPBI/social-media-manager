import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PlatformVariantDto {
  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty({ example: 'social-account-id' })
  @IsString()
  socialAccountId!: string;

  @ApiProperty({ example: 'Cancel910gas is building a movement...' })
  @IsString()
  caption!: string;

  @ApiPropertyOptional({ type: [String], example: ['Cancel910gas', 'GasPricing'] })
  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @ApiPropertyOptional({ example: 'https://youtube.com/@cancel910gas' })
  @IsOptional()
  @IsString()
  linkUrl?: string;
}

export class CreateScheduleDto {
  @ApiProperty({ example: 'content-id' })
  @IsString()
  contentItemId!: string;

  @ApiProperty({ example: '2026-06-18T12:00:00.000Z' })
  @IsDateString()
  scheduledTime!: string;

  @ApiPropertyOptional({ example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ type: [PlatformVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformVariantDto)
  variants!: PlatformVariantDto[];
}

export class RescheduleDto {
  @ApiProperty({ example: '2026-06-18T12:00:00.000Z' })
  @IsDateString()
  scheduledTime!: string;
}

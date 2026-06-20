import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateContentDto {
  @ApiPropertyOptional({ example: 'cms-123' })
  @IsOptional()
  @IsString()
  cmsContentId?: string;

  @ApiProperty({ example: '9/10 Gas Pricing: A Massive Failure' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Cancel910gas is building a subscriber-driven movement...' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/image.png'] })
  @IsOptional()
  @IsArray()
  mediaAssets?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Cancel910gas', 'GasPricing'] })
  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @ApiPropertyOptional({ example: 'https://youtube.com/@cancel910gas' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  linkUrl?: string;
}

export class UpdateContentDto extends CreateContentDto {}

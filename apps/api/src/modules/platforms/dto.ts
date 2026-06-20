import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class MockConnectDto {
  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty({ example: 'Cancel910gas Facebook Page' })
  @IsString()
  accountName!: string;
}

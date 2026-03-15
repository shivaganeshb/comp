import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAccessRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  purpose?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  requestedDurationDays?: number;
}

export class ApproveAccessRequestDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  durationDays?: number;
}

export class DenyAccessRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class RevokeGrantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export enum AccessRequestStatusFilter {
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELED = 'canceled',
}

export class ListAccessRequestsDto {
  @ApiPropertyOptional({ enum: AccessRequestStatusFilter })
  @IsEnum(AccessRequestStatusFilter)
  @IsOptional()
  status?: AccessRequestStatusFilter;
}

export class ReclaimAccessDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

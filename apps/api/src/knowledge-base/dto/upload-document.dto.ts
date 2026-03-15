import { IsBase64, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-\+\.]+$/, {
    message: 'Invalid MIME type format',
  })
  fileType!: string;

  @IsString()
  @IsNotEmpty()
  @IsBase64()
  fileData!: string; // base64 encoded

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

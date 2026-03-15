import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignNdaDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty()
  @IsBoolean()
  accept: boolean;
}

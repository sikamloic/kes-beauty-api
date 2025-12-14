import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * Types de documents acceptés pour l'inscription
 */
export enum DocumentType {
  IDENTITY_CARD = 'identity_card',
  DIPLOMA = 'diploma',
  PORTFOLIO = 'portfolio',
}

/**
 * DTO Upload document inscription
 * P0.1 - Validation Provider
 */
export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type de document',
    enum: DocumentType,
    example: DocumentType.IDENTITY_CARD,
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type!: DocumentType;

  @ApiProperty({
    description: 'ID du provider',
    example: 1,
  })
  @IsString()
  @IsNotEmpty()
  providerId!: string;
}

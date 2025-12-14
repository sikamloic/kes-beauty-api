import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * DTO Envoi Code Vérification SMS
 */
export class SendVerificationCodeDto {
  @ApiProperty({
    description: 'Numéro de téléphone à vérifier',
    example: '683264591',
  })
  @IsString()
  @Matches(/^[0-9]{9}$/, {
    message: 'Format téléphone invalide (9 chiffres attendus)',
  })
  phone!: string;
}

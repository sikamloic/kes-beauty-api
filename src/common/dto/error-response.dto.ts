import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les réponses d'erreur standardisées
 * Principe SOLID: ISP - Interface ségrégée pour les erreurs
 * Format cohérent avec ApiSuccessResponseDto (success: false)
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indique une erreur',
    example: false,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Code HTTP de l\'erreur',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Code d\'erreur applicatif',
    example: 'VALIDATION_ERROR',
  })
  code!: string;

  @ApiProperty({
    description: 'Message d\'erreur',
    example: 'Les données fournies sont invalides',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp de l\'erreur',
    example: '2025-01-23T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Chemin de la requête',
    example: '/api/v1/appointments',
    required: false,
  })
  path?: string;

  @ApiProperty({
    description: 'Détails additionnels de l\'erreur',
    required: false,
    example: {
      validationErrors: {
        email: ['Email invalide'],
        phone: ['Numéro de téléphone requis'],
      },
    },
  })
  details?: Record<string, unknown>;
}

/**
 * DTO pour les erreurs de validation
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Erreurs de validation par champ',
    example: {
      email: ['Email invalide', 'Email déjà utilisé'],
      phone: ['Numéro de téléphone requis'],
    },
  })
  validationErrors?: Record<string, string[]>;
}

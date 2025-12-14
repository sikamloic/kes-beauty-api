import { ApiProperty } from '@nestjs/swagger';

/**
 * Format de réponse API standardisé
 * Principe SOLID: ISP - Interface segregation pour réponses cohérentes
 */

/**
 * Métadonnées de pagination
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Page actuelle' })
  currentPage!: number;

  @ApiProperty({ example: 10, description: 'Éléments par page' })
  perPage!: number;

  @ApiProperty({ example: 100, description: 'Total d\'éléments' })
  total!: number;

  @ApiProperty({ example: 10, description: 'Nombre total de pages' })
  totalPages!: number;

  @ApiProperty({ example: true, description: 'A une page suivante' })
  hasNextPage!: boolean;

  @ApiProperty({ example: false, description: 'A une page précédente' })
  hasPreviousPage!: boolean;
}

/**
 * Métadonnées de réponse
 */
export class ResponseMetaDto {
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Timestamp de la réponse' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/providers', description: 'Chemin de la requête' })
  path!: string;

  @ApiProperty({ example: 'GET', description: 'Méthode HTTP' })
  method!: string;

  @ApiProperty({ example: 150, description: 'Temps de traitement en ms', required: false })
  duration?: number;

  @ApiProperty({ type: PaginationMetaDto, required: false, description: 'Métadonnées de pagination' })
  pagination?: PaginationMetaDto;
}

/**
 * Réponse API standardisée - Succès
 */
export class ApiSuccessResponseDto<T = any> {
  @ApiProperty({ example: true, description: 'Indique le succès de la requête' })
  success!: boolean;

  @ApiProperty({ example: 'Opération réussie', description: 'Message de succès' })
  message!: string;

  @ApiProperty({ description: 'Données de la réponse' })
  data!: T;

  @ApiProperty({ type: ResponseMetaDto, description: 'Métadonnées de la réponse' })
  meta!: ResponseMetaDto;

  constructor(data: T, message: string, meta: Partial<ResponseMetaDto>) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      path: meta.path || '',
      method: meta.method || '',
      ...meta,
    };
  }
}

/**
 * Réponse API standardisée - Succès avec pagination
 */
export class ApiPaginatedResponseDto<T = any> {
  @ApiProperty({ example: true, description: 'Indique le succès de la requête' })
  success!: boolean;

  @ApiProperty({ example: 'Liste récupérée avec succès', description: 'Message de succès' })
  message!: string;

  @ApiProperty({ description: 'Liste des données', isArray: true })
  data!: T[];

  @ApiProperty({ type: ResponseMetaDto, description: 'Métadonnées avec pagination' })
  meta!: ResponseMetaDto;

  constructor(
    data: T[],
    message: string,
    pagination: PaginationMetaDto,
    meta: Partial<ResponseMetaDto>,
  ) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      path: meta.path || '',
      method: meta.method || '',
      pagination,
      ...meta,
    };
  }
}

/**
 * Réponse API standardisée - Succès sans données
 */
export class ApiMessageResponseDto {
  @ApiProperty({ example: true, description: 'Indique le succès de la requête' })
  success!: boolean;

  @ApiProperty({ example: 'Opération réussie', description: 'Message de succès' })
  message!: string;

  @ApiProperty({ type: ResponseMetaDto, description: 'Métadonnées de la réponse' })
  meta!: ResponseMetaDto;

  constructor(message: string, meta: Partial<ResponseMetaDto>) {
    this.success = true;
    this.message = message;
    this.meta = {
      timestamp: new Date().toISOString(),
      path: meta.path || '',
      method: meta.method || '',
      ...meta,
    };
  }
}

/**
 * Helper pour créer des réponses standardisées
 */
export class ApiResponseHelper {
  /**
   * Créer une réponse de succès
   */
  static success<T>(
    data: T,
    message = 'Opération réussie',
    meta: Partial<ResponseMetaDto> = {},
  ): ApiSuccessResponseDto<T> {
    return new ApiSuccessResponseDto(data, message, meta);
  }

  /**
   * Créer une réponse paginée
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationMetaDto,
    message = 'Liste récupérée avec succès',
    meta: Partial<ResponseMetaDto> = {},
  ): ApiPaginatedResponseDto<T> {
    return new ApiPaginatedResponseDto(data, message, pagination, meta);
  }

  /**
   * Créer une réponse message uniquement
   */
  static message(
    message: string,
    meta: Partial<ResponseMetaDto> = {},
  ): ApiMessageResponseDto {
    return new ApiMessageResponseDto(message, meta);
  }

  /**
   * Calculer métadonnées de pagination
   */
  static calculatePagination(
    total: number,
    page: number,
    perPage: number,
  ): PaginationMetaDto {
    const totalPages = Math.ceil(total / perPage);

    return {
      currentPage: page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}

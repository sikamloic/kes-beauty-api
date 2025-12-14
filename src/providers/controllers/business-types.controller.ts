import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Contrôleur Business Types
 * Endpoints publics pour récupérer les types de business
 */
@ApiTags('Business Types')
@Controller('business-types')
export class BusinessTypesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /business-types
   * Liste tous les types de business actifs avec traductions
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des types de business',
    description: 'Récupère tous les types de business disponibles pour les providers, triés par ordre d\'affichage. Supporte le multilinguisme via Accept-Language header.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Langue souhaitée (fr, en). Défaut: fr',
    example: 'fr',
  })
  async findAll(@Headers('accept-language') acceptLanguage?: string) {
    const locale = this.parseLocale(acceptLanguage);

    const businessTypes = await this.prisma.businessType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    return businessTypes.map((bt) => ({
      id: bt.id,
      code: bt.code,
      icon: bt.icon,
      label: bt.translations[0]?.label || bt.code,
      description: bt.translations[0]?.description || null,
    }));
  }

  /**
   * Parse Accept-Language header
   * Exemples: "fr-FR,fr;q=0.9,en;q=0.8" => "fr"
   */
  private parseLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) return 'fr';

    // Parse primary language
    const firstPart = acceptLanguage.split(',')[0];
    const langPart = firstPart?.split('-')[0];
    const primary = langPart?.toLowerCase() ?? 'fr';

    // Langues supportées
    const supportedLocales = ['fr', 'en'];
    return supportedLocales.includes(primary) ? primary : 'fr';
  }
}

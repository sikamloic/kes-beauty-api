import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Service upload fichiers
 * 
 * Principe SOLID:
 * - SRP: Upload/suppression fichiers uniquement
 * - Utilisé par: Providers (documents), Services (photos), etc.
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get('UPLOAD_DIR') || './uploads';
  }

  /**
   * Upload un fichier
   */
  async upload(
    file: any, // TODO: Typer correctement avec @types/multer
    folder: string,
  ): Promise<{ url: string; path: string }> {
    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadDir, folder, fileName);

    // Créer le dossier si n'existe pas
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Écrire le fichier
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`📁 Fichier uploadé: ${filePath}`);

    return {
      url: `/uploads/${folder}/${fileName}`,
      path: filePath,
    };
  }

  /**
   * Supprimer un fichier
   */
  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`🗑️ Fichier supprimé: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Impossible de supprimer ${filePath}: ${error}`);
    }
  }

  /**
   * Valider le fichier
   */
  validateFile(
    file: any, // TODO: Typer correctement avec @types/multer
    options: {
      maxSize?: number;
      allowedTypes?: string[];
    },
  ): void {
    // Vérifier taille
    if (options.maxSize && file.size > options.maxSize) {
      const maxMB = (options.maxSize / (1024 * 1024)).toFixed(1);
      throw new Error(`Fichier trop volumineux (max: ${maxMB}MB)`);
    }

    // Vérifier type MIME
    if (
      options.allowedTypes &&
      !options.allowedTypes.includes(file.mimetype)
    ) {
      throw new Error(
        `Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${options.allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Générer nom de fichier unique
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    return `${safeName}_${timestamp}_${random}${ext}`;
  }

  /**
   * Obtenir la taille du fichier en MB
   */
  getFileSizeMB(sizeBytes: number): number {
    return sizeBytes / (1024 * 1024);
  }
}

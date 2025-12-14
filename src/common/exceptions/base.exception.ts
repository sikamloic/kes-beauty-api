/**
 * Exception de base pour toutes les exceptions custom de l'application
 * Principe SOLID: OCP - Ouvert à l'extension, fermé à la modification
 */
export abstract class BaseException extends Error {
  public readonly timestamp: Date;
  public readonly path?: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convertit l'exception en objet JSON pour la réponse HTTP
   */
  toJSON(): Record<string, unknown> {
    return {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      path: this.path,
      details: this.details,
    };
  }
}

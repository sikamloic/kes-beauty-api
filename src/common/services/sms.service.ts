import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service SMS
 * 
 * Principe SOLID:
 * - SRP: Envoi SMS uniquement
 * - Utilisé par: Providers, Clients, Auth, Appointments, etc.
 * - TODO: Intégration API SMS (Orange, MTN, etc.)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    // @ts-expect-error - Sera utilisé pour configuration API SMS
    private readonly config: ConfigService,
  ) {}

  /**
   * Envoyer un SMS de vérification
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    this.logger.log(`📱 Envoi SMS vérification à ${phone}: ${code}`);

    // TODO P0.1: Intégration API SMS
    // const apiKey = this.config.get('SMS_API_KEY');
    // await this.smsProvider.send({
    //   to: phone,
    //   message: `Votre code de vérification Beauty: ${code}. Valide 10 minutes.`
    // });

    // En dev: Log uniquement
    this.logger.debug(`Code: ${code} pour ${phone}`);
  }

  /**
   * Envoyer notification rendez-vous
   */
  async sendAppointmentNotification(
    phone: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`📱 Envoi notification RDV à ${phone}`);

    // TODO P0.2: Intégration API SMS
    this.logger.debug(`Message: ${message}`);
  }

  /**
   * Envoyer notification générique
   */
  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`📱 Envoi SMS à ${phone}`);

    // TODO: Intégration API SMS
    this.logger.debug(`Message: ${message}`);
  }

  /**
   * Générer code de vérification (6 chiffres)
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Vérifier si un code est valide (format)
   */
  isValidCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }
}

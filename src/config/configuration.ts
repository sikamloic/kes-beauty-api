/**
 * Configuration centralisée de l'application
 * Utilise les variables d'environnement avec validation
 */

export default () => ({
  // Application
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    name: process.env.APP_NAME || 'Beauty Platform API',
    url: process.env.APP_URL || 'http://localhost:4000',
  },

  // Base de données
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'local_aggregator',
    apiKey: process.env.SMS_API_KEY,
    apiUrl: process.env.SMS_API_URL,
    senderName: process.env.SMS_SENDER_NAME || 'BeautyApp',
  },

  // Orange Money
  orangeMoney: {
    apiKey: process.env.ORANGE_MONEY_API_KEY,
    apiSecret: process.env.ORANGE_MONEY_API_SECRET,
    merchantId: process.env.ORANGE_MONEY_MERCHANT_ID,
    apiUrl:
      process.env.ORANGE_MONEY_API_URL ||
      'https://api.orange.com/orange-money-webpay/cm/v1',
    webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
  },

  // MTN Money
  mtnMoney: {
    apiKey: process.env.MTN_MONEY_API_KEY,
    apiSecret: process.env.MTN_MONEY_API_SECRET,
    subscriptionKey: process.env.MTN_MONEY_SUBSCRIPTION_KEY,
    apiUrl:
      process.env.MTN_MONEY_API_URL || 'https://sandbox.momodeveloper.mtn.com',
    webhookSecret: process.env.MTN_MONEY_WEBHOOK_SECRET,
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:4000',
    ],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedImageTypes:
      process.env.ALLOWED_IMAGE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
  },

  // Email (optionnel)
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || 'noreply@beautyplatform.cm',
    },
  },
});

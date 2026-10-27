import * as Joi from 'joi';
import { validateDatabaseUrl } from './app.config';

const databaseBinding = Joi.string()
  .uri({ scheme: ['postgres', 'postgresql'] })
  .empty('')
  .optional();

const environmentValidation = Joi.object({
  // App Config
  NODE_ENV: Joi.string()
    .empty('')
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  FRONTEND_URL: Joi.string().required(),
  DATABASE_URL: databaseBinding,
  DATABASE_URL_RECYCLELENS: databaseBinding,

  // JWT Config
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_TOKEN_SECRET: Joi.string()
    .invalid(Joi.ref('JWT_SECRET'))
    .required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().integer().positive().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.number().integer().positive().required(),

  // Resend Config
  RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().required(),

  // Email Config
  EMAIL_HOST: Joi.string().required(),
  EMAIL_PORT: Joi.number().integer().positive().required(),
  EMAIL_USERNAME: Joi.string().required(),
  EMAIL_PASSWORD: Joi.string().required(),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),

  BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .empty('')
    .optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().empty('').optional(),
  CLOUDINARY_API_KEY: Joi.string().empty('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().empty('').optional(),
  CHAT_DOMAIN: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .empty('')
    .optional(),
  CHATBOT_CODE: Joi.string().empty('').optional(),
  CHATBOT_CODE_GREENLEN: Joi.string().empty('').optional(),
})
  .pattern(/^DATABASE_URL_[A-Z][A-Z0-9_]{0,63}$/, databaseBinding)
  .custom((values: Record<string, unknown>, helpers) => {
    const bindings = Object.entries(values).filter(
      ([key, value]) =>
        /^DATABASE_URL_[A-Z][A-Z0-9_]{0,63}$/.test(key) && value,
    );
    if (!bindings.length)
      return helpers.message({
        custom: 'Configure a tenant database binding.',
      });
    try {
      for (const [, value] of bindings) validateDatabaseUrl(value as string);
      if (values.DATABASE_URL)
        validateDatabaseUrl(values.DATABASE_URL as string);
    } catch {
      return helpers.message({
        custom: 'Invalid PostgreSQL database configuration.',
      });
    }
    return values;
  })
  .and('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');

export default environmentValidation;

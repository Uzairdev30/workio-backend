import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        APP_URL: Joi.string().required(),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
        MONGODB_URI: Joi.string().required(),
        MONGODB_DB_NAME: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM_NAME: Joi.string().required(),
        SMTP_FROM_EMAIL: Joi.string().required(),
      }),
    }),
  ],
})
export class ConfigModule {}

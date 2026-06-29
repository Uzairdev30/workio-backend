import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(helmet());
  app.use(compression());

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const config = new DocumentBuilder()
    .setTitle('Workio API')
    .setDescription('Enterprise EOD Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Company')
    .addTag('EOD Reports')
    .addTag('Tasks & Projects')
    .addTag('Attendance')
    .addTag('Leaves')
    .addTag('Notifications')
    .addTag('Analytics')
    .addTag('Super Admin')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Workio API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();

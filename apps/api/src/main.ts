import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const webBaseUrl = config.get<string>('WEB_BASE_URL') || 'http://localhost:5173';
  const uploadDir = config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });

  app.setGlobalPrefix('api');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.enableCors({
    origin: [webBaseUrl, 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const docs = new DocumentBuilder()
    .setTitle('Social Media Manager Hybrid API')
    .setDescription('Scheduling, publishing, rate limits, media, analytics and reports API')
    .setVersion('1.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, docs);
  SwaggerModule.setup('docs', app, document);

  const port = Number(config.get('API_PORT') || 4000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}
bootstrap();

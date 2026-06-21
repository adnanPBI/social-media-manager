import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const webBaseUrl = config.get<string>('WEB_BASE_URL') || 'http://localhost:5173';
  const uploadDir = config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });

  app.setGlobalPrefix('api');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // Production: serve the built React UI from the same origin so the
  // subdomain can host UI + API through one NestJS process.
  // Gated on WEB_DIST_PATH so local dev is unaffected.
  const webDistPath = process.env.WEB_DIST_PATH;
  if (webDistPath && existsSync(webDistPath)) {
    app.useStaticAssets(webDistPath);
    const expressInstance = app.getHttpAdapter().getInstance() as any;
    expressInstance.use((req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/docs')
      ) {
        return next();
      }
      res.sendFile(join(webDistPath, 'index.html'));
    });
  }

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

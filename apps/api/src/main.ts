import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { EnvConfig } from './core/config/env.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  const config = app.get<ConfigService<EnvConfig, true>>(ConfigService);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } } }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '100kb' });

  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-GNK-CSRF',
      'X-GNK-Account',
      'Idempotency-Key',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`GNK Connect API listening on http://0.0.0.0:${port}/api/v1`);
}
bootstrap();

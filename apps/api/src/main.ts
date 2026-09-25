import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './core/config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get<ConfigService<EnvConfig>>(ConfigService);

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = configService.get('CORS_ORIGINS', { infer: true })?.split(',') || [];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT', { infer: true }) || 4000;
  await app.listen(port);
  logger.log(`🚀 GNK Connect Enterprise B2B API running on: http://localhost:${port}/api/v1`);
}
bootstrap();

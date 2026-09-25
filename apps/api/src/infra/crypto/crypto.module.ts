import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../core/config/env.config';
import { CryptoService, PII_KEYS } from './crypto.service';

@Global()
@Module({
  providers: [
    {
      provide: PII_KEYS,
      useFactory: () =>
        process.env.PII_ENCRYPTION_KEY ||
        'v1:0000000000000000000000000000000000000000000000000000000000000000',
    },
    CryptoService,
  ],
  exports: [CryptoService],
})
export class CryptoModule {}

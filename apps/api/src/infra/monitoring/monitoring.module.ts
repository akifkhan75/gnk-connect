import { Global, Module } from '@nestjs/common';
import { ErrorReporter } from './error-reporter.service';

@Global()
@Module({ providers: [ErrorReporter], exports: [ErrorReporter] })
export class MonitoringModule {}

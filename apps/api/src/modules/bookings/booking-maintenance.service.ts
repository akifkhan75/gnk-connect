import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { BookingEngineService } from './booking-engine.service';
import { BookingsService } from './bookings.service';

/** Hourly housekeeping: marks trips that have returned as completed + expires stale holds. */
@Injectable()
export class BookingMaintenanceService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BookingMaintenanceService.name);
  private timer?: NodeJS.Timeout;
  private holdTimer?: NodeJS.Timeout;

  constructor(
    private readonly bookings: BookingsService,
    private readonly engine: BookingEngineService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    const run = () =>
      this.bookings
        .completeFinished()
        .then((n) => n && this.logger.log(`Completed ${n} finished booking(s)`))
        .catch((e) => this.logger.error(`Booking maintenance failed: ${e.message}`));
    setTimeout(run, 10_000);
    this.timer = setInterval(run, 60 * 60_000);

    const sweep = () =>
      this.engine
        .expireStaleHolds()
        .then((n) => n && this.logger.log(`Expired ${n} stale hold(s)`))
        .catch((e) => this.logger.error(`Hold sweep failed: ${e.message}`));
    setTimeout(sweep, 15_000);
    this.holdTimer = setInterval(sweep, 45_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.holdTimer) clearInterval(this.holdTimer);
  }
}

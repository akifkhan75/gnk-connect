import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { BookingsService } from './bookings.service';

/** Hourly housekeeping: marks trips that have returned as completed. */
@Injectable()
export class BookingMaintenanceService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BookingMaintenanceService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly bookings: BookingsService) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    const run = () =>
      this.bookings
        .completeFinished()
        .then((n) => n && this.logger.log(`Completed ${n} finished booking(s)`))
        .catch((e) => this.logger.error(`Booking maintenance failed: ${e.message}`));
    setTimeout(run, 10_000);
    this.timer = setInterval(run, 60 * 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

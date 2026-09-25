import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  getAllBookings() {
    return this.bookingsService.getAllBookings();
  }

  @Get(':id')
  getBookingById(@Param('id') id: string) {
    return this.bookingsService.getBookingById(id);
  }

  @Post(':id/approve-push')
  approveAndPush(@Param('id') id: string) {
    return this.bookingsService.approveAndPushToSupplier(id);
  }
}

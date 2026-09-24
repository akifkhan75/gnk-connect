import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Roles('GNK_ADMIN')
  @Post(':id/approve-push')
  approveAndPush(@Param('id') id: string) {
    return this.bookingsService.approveAndPushToSupplier(id);
  }
}

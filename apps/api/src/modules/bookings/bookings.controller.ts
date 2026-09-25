import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  createBooking(@Body() body: any) {
    // Ideally extract accountId and userId from JWT
    const { accountId, userId, quoteId, idempotencyKey, passengers, agentNotes } = body;
    return this.bookingsService.createBooking({
      accountId,
      userId,
      quoteId,
      idempotencyKey,
      passengers,
      agentNotes
    });
  }

  @Post(':id/approve')
  approveBooking(@Param('id') id: string, @Body() body: any) {
    // Ideally extract adminId from JWT
    const { adminId } = body;
    return this.bookingsService.approveBooking(id, adminId);
  }
}

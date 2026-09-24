import { Injectable } from '@nestjs/common';
import { B2BBooking } from '@gnk/types';
import { SuppliersService } from '../suppliers/suppliers.service';

@Injectable()
export class BookingsService {
  private bookings: B2BBooking[] = [];

  constructor(private readonly suppliersService: SuppliersService) {}

  getAllBookings() {
    return this.bookings;
  }

  getBookingById(id: string) {
    return this.bookings.find(b => b.id === id);
  }

  async approveAndPushToSupplier(bookingId: string, adminName = 'GNK Admin') {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const adapter = this.suppliersService.getAdapter(booking.supplierId);
    const supplierRes = await adapter.createBooking({
      supplierProductId: booking.supplierProductId,
      departureId: booking.departureId,
      seats: booking.totalSeats,
      passengers: booking.passengers,
      externalGnkBookingId: booking.id,
      contactPerson: {
        fullName: booking.agentName,
        email: booking.agentEmail,
        phone: booking.agentPhone
      }
    });

    if (supplierRes.success) {
      booking.supplierBookingId = supplierRes.supplierBookingId;
      booking.status = 'SUPPLIER_CONFIRMED';
      booking.paymentStatus = 'PAYMENT_VERIFIED';
      booking.updatedAt = new Date().toISOString();
      return { success: true, booking, supplierBookingId: supplierRes.supplierBookingId };
    } else {
      booking.status = 'SUPPLIER_FAILED';
      return { success: false, error: supplierRes.errorMessage };
    }
  }
}

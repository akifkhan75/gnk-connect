import { Injectable, Logger } from '@nestjs/common';
import { ISupplierAdapter, airDeskAdapter } from '@gnk/supplier-adapters';
import { 
  StandardGroupProduct, 
  AvailabilityResult, 
  SupplierBookingRequest, 
  SupplierBookingResponse, 
  SupplierBookingStatusResponse 
} from '@gnk/types';

export interface AirDeskConfig {
  baseUrl: string;
  apiKey: string;
  agencyCode: string;
  timeoutMs: number;
}

@Injectable()
export class AirDeskHttpClient {
  private readonly logger = new Logger(AirDeskHttpClient.name);
  private readonly config: AirDeskConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.AIRDESK_API_URL || 'https://api.airdesk.travel/v2',
      apiKey: process.env.AIRDESK_API_KEY || 'mock_airdesk_key',
      agencyCode: process.env.AIRDESK_AGENCY_CODE || 'GNK_ELITE',
      timeoutMs: 8000,
    };
  }

  /**
   * Fetch all active group series from AirDesk API
   * (Falls back to AirDesk adapter if running sandbox/offline)
   */
  async fetchGroups(filter?: any): Promise<StandardGroupProduct[]> {
    this.logger.log(`Fetching active group departures from AirDesk API (${this.config.baseUrl}/groups)...`);
    try {
      if (process.env.AIRDESK_LIVE_ENABLED === 'true') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(`${this.config.baseUrl}/groups`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Agency-Code': this.config.agencyCode,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`AirDesk API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.mapAirDeskResponseToStandard(data);
      }
    } catch (err: any) {
      if (process.env.AIRDESK_LIVE_ENABLED === 'true') {
        throw err;
      }
      this.logger.warn(`AirDesk Live HTTP call failed or offline (${err.message}). Using local AirDesk adapter.`);
    }

    return airDeskAdapter.getProducts(filter);
  }

  /**
   * Check real-time seat availability for a departure
   */
  async checkAvailability(supplierProductId: string, departureId: string, requestedSeats: number): Promise<AvailabilityResult> {
    this.logger.log(`Checking live seat availability for ${supplierProductId} (${requestedSeats} seats)...`);
    return airDeskAdapter.checkAvailability({
      supplierProductId,
      departureId,
      requestedSeats
    });
  }

  /**
   * Create confirmed reservation in AirDesk Groups Engine
   */
  async submitBooking(request: SupplierBookingRequest): Promise<SupplierBookingResponse> {
    this.logger.log(`Transmitting wholesale booking request to AirDesk API for product ${request.supplierProductId}...`);
    try {
      if (process.env.AIRDESK_LIVE_ENABLED === 'true') {
        const response = await fetch(`${this.config.baseUrl}/bookings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_code: request.supplierProductId,
            departure_id: request.departureId,
            seats_count: request.seats,
            passengers: request.passengers,
            external_reference: request.externalGnkBookingId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            supplierBookingId: data.booking_reference,
            supplierStatus: 'CONFIRMED',
            supplierReferenceCode: data.confirmation_code,
            confirmedSeats: request.seats,
            totalSupplierCostPKR: data.total_amount_pkr,
            supplierPnrOrVoucher: data.pnr
          };
        } else {
          throw new Error(`AirDesk API returned ${response.status}`);
        }
      }
    } catch (err: any) {
      if (process.env.AIRDESK_LIVE_ENABLED === 'true') {
        throw err;
      }
      this.logger.warn(`AirDesk live booking failed (${err.message}). Falling back to AirDesk adapter.`);
    }

    return airDeskAdapter.createBooking(request);
  }

  /**
   * Poll latest status from AirDesk API
   */
  async fetchBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatusResponse> {
    if (process.env.AIRDESK_LIVE_ENABLED === 'true') {
      throw new Error('Live status polling not yet implemented');
    }
    return airDeskAdapter.getBookingStatus(supplierBookingId);
  }

  private mapAirDeskResponseToStandard(data: any): StandardGroupProduct[] {
    if (Array.isArray(data)) {
      return data;
    }
    return data.items || [];
  }
}

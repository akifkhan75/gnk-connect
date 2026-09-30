import { Injectable } from '@nestjs/common';
import type { RequestMeta } from '../../core/http/request-meta';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { BookingEngineService } from './booking-engine.service';

/**
 * Thin façade over inventory booking concession / deadline-extension flows.
 * Keeps controller imports aligned with the AirDesk module split.
 */
@Injectable()
export class BookingConcessionService {
  constructor(private readonly engine: BookingEngineService) {}

  requestConcession(
    actor: PartnerActor,
    bookingId: string,
    dto: {
      kind: 'CHILD_SEATS' | 'INFANT_SEATS' | 'DISCOUNT';
      requestedChildSeats?: number;
      requestedInfantSeats?: number;
      requestedDiscountAmount?: number;
      reason?: string;
    },
  ) {
    return this.engine.requestConcession(actor, bookingId, dto);
  }

  decideConcession(
    actor: StaffActor,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    dto: {
      approvedChildSeats?: number;
      approvedInfantSeats?: number;
      approvedDiscountAmount?: number;
      decisionNote?: string;
      pnrCode?: string;
    },
  ) {
    return this.engine.decideConcession(actor, requestId, decision, dto);
  }

  listConcessions(bookingId: string) {
    return this.engine.listConcessions(bookingId);
  }

  requestExtension(
    actor: PartnerActor,
    bookingId: string,
    dto: { minutes: number; reason?: string },
    meta: RequestMeta,
  ) {
    return this.engine.requestExtension(actor, bookingId, dto, meta);
  }

  extendDeadline(
    actor: StaffActor,
    bookingId: string,
    extensionMinutes: number,
    meta: RequestMeta,
  ) {
    return this.engine.adjustDeadline(bookingId, extensionMinutes, actor, meta);
  }
}

import { Module } from '@nestjs/common';
import { BookingMaintenanceService } from './bookings/booking-maintenance.service';
import { BookingMapper } from './bookings/booking.mapper';
import {
  AdminBookingsController,
  AdminInvoicesController,
  PartnerBookingsController,
  PartnerInvoicesController,
} from './bookings/bookings.controller';
import { BookingsService } from './bookings/bookings.service';
import {
  AdminCatalogController,
  PartnerGroupsController,
  PublicGroupsController,
} from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import {
  AdminDashboardController,
  PartnerDashboardController,
} from './dashboard/dashboard.controller';
import { AdminFilesController, PartnerFilesController } from './files/files.controller';
import { FilesService } from './files/files.service';
import { AdminLedgerController, PartnerLedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import {
  AdminNotificationsController,
  PartnerNotificationsController,
} from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import {
  AdminPartnersController,
  PartnerAccountController,
  PartnerTeamController,
} from './partners/partners.controller';
import { PartnersService } from './partners/partners.service';
import { AdminPaymentsController, PartnerPaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { AdminPricingController, PartnerQuotesController } from './pricing/pricing.controller';
import { PricingService } from './pricing/pricing.service';
import { PublicController } from './public/public.controller';
import {
  AdminSettingsController,
  PartnerPaymentInstructionsController,
} from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import {
  AdminAuditController,
  AdminRolesController,
  AdminStaffController,
} from './staff/staff.controller';
import { SupplierGatewayService } from './suppliers/supplier-gateway.service';
import { SupplierSyncService } from './suppliers/supplier-sync.service';
import { AdminSuppliersController } from './suppliers/suppliers.controller';

/** All business modules: partner portal (/partner), admin console (/admin) and public endpoints. */
@Module({
  controllers: [
    PublicController,
    PublicGroupsController,
    // partner realm
    PartnerDashboardController,
    PartnerAccountController,
    PartnerTeamController,
    PartnerGroupsController,
    PartnerQuotesController,
    PartnerBookingsController,
    PartnerInvoicesController,
    PartnerPaymentsController,
    PartnerPaymentInstructionsController,
    PartnerLedgerController,
    PartnerNotificationsController,
    PartnerFilesController,
    // staff realm
    AdminDashboardController,
    AdminPartnersController,
    AdminBookingsController,
    AdminInvoicesController,
    AdminPaymentsController,
    AdminLedgerController,
    AdminPricingController,
    AdminCatalogController,
    AdminSuppliersController,
    AdminStaffController,
    AdminRolesController,
    AdminAuditController,
    AdminSettingsController,
    AdminNotificationsController,
    AdminFilesController,
  ],
  providers: [
    BookingMapper,
    BookingsService,
    BookingMaintenanceService,
    CatalogService,
    FilesService,
    LedgerService,
    NotificationsService,
    PartnersService,
    PaymentsService,
    PricingService,
    SettingsService,
    SupplierGatewayService,
    SupplierSyncService,
  ],
})
export class PlatformModule {}

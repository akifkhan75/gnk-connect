import { Module } from '@nestjs/common';
import { BookingDocumentsService } from './bookings/booking-documents.service';
import { BookingEngineService } from './bookings/booking-engine.service';
import { BookingConcessionService } from './bookings/booking-concession.service';
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
  AdminInventoryGroupsController,
  PartnerInventoryGroupsController,
} from './inventory/inventory.controller';
import { InventoryCatalogService } from './inventory/inventory-catalog.service';
import { InventoryEngineService } from './inventory/inventory-engine.service';
import { GroupPnrService } from './inventory/group-pnr.service';
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
import { AdminAccountingController } from './ledger/accounting.controller';
import { ChartService } from './ledger/chart.service';
import { CurrenciesService } from './ledger/currencies.service';
import { AdminLedgerController, PartnerLedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import { ReportsService } from './ledger/reports.service';
import { VouchersService } from './ledger/vouchers.service';
import { AdminEventsController, PartnerEventsController } from './realtime/realtime.controller';
import { RealtimeService } from './realtime/realtime.service';
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
import { PartnerUsersService } from './partners/partner-users.service';
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
import { PermissionsSyncService } from './staff/permissions-sync.service';
import { StaffService } from './staff/staff.service';
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
    PartnerInventoryGroupsController,
    PartnerQuotesController,
    PartnerBookingsController,
    PartnerInvoicesController,
    PartnerPaymentsController,
    PartnerPaymentInstructionsController,
    PartnerLedgerController,
    PartnerNotificationsController,
    PartnerFilesController,
    PartnerEventsController,
    // staff realm
    AdminDashboardController,
    AdminPartnersController,
    AdminBookingsController,
    AdminInvoicesController,
    AdminPaymentsController,
    AdminLedgerController,
    AdminAccountingController,
    AdminPricingController,
    AdminCatalogController,
    AdminInventoryGroupsController,
    AdminSuppliersController,
    AdminStaffController,
    AdminRolesController,
    AdminAuditController,
    AdminSettingsController,
    AdminNotificationsController,
    AdminFilesController,
    AdminEventsController,
  ],
  providers: [
    BookingMapper,
    BookingsService,
    BookingEngineService,
    BookingConcessionService,
    BookingMaintenanceService,
    BookingDocumentsService,
    InventoryEngineService,
    InventoryCatalogService,
    GroupPnrService,
    CatalogService,
    FilesService,
    LedgerService,
    ChartService,
    VouchersService,
    ReportsService,
    CurrenciesService,
    RealtimeService,
    NotificationsService,
    PartnersService,
    PartnerUsersService,
    PaymentsService,
    PricingService,
    SettingsService,
    StaffService,
    PermissionsSyncService,
    SupplierGatewayService,
    SupplierSyncService,
  ],
})
export class PlatformModule {}

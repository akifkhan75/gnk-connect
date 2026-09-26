import type { KycDocType, PartnerRole } from '@gnk/types';

export const ROLE_LABEL: Record<PartnerRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Booking staff',
  ACCOUNTANT: 'Accountant',
};

export const ROLE_HINT: Record<PartnerRole, string> = {
  OWNER: 'Full access, including account details and documents',
  MANAGER: 'Bookings, payments, ledger and team (staff and accountants)',
  STAFF: 'Search groups and manage their own bookings',
  ACCOUNTANT: 'Payments, receipts, statement, invoices and all bookings (read only)',
};

export const DOC_LABEL: Record<KycDocType, string> = {
  DTS_LICENSE: 'DTS licence',
  NTN_CERTIFICATE: 'NTN certificate',
  CNIC_FRONT: 'CNIC (front)',
  CNIC_BACK: 'CNIC (back)',
  IATA_CERTIFICATE: 'IATA certificate',
  BANK_LETTER: 'Bank letter',
  OTHER: 'Other document',
};

export const TYPE_LABEL: Record<string, string> = {
  GROUP: 'Group ticket',
  UMRAH: 'Umrah package',
  HOTEL: 'Hotel',
  ZIARAT: 'Ziarat',
  OTHER: 'Other',
};

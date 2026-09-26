import type { PartnerAccountStatus, PartnerAccountType, PartnerRole } from '@prisma/client';
import type { Permission } from '@gnk/types';

export const PARTNER_AUDIENCE = 'gnk-portal';
export const STAFF_AUDIENCE = 'gnk-admin';
export const ISSUER = 'gnk-connect-api';

/** JWT claims. Deliberately carries no role, status or permissions (plan 04 §2). */
export interface AccessClaims {
  sub: string;
  sid: string;
  acc?: string; // partner: active account id
  aud: string;
  iss: string;
  exp: number;
  iat: number;
}

export interface PartnerActor {
  realm: 'PARTNER';
  userId: string;
  sessionId: string;
  email: string;
  fullName: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: PartnerAccountType;
  accountStatus: PartnerAccountStatus;
  role: PartnerRole;
  mustChangePassword: boolean;
}

export interface StaffActor {
  realm: 'STAFF';
  userId: string;
  sessionId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: Set<Permission>;
  mustChangePassword: boolean;
}

export type Actor = PartnerActor | StaffActor;

export const actorRef = (a: Actor) => ({ realm: a.realm, userId: a.userId });

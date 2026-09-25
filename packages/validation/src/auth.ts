import { z } from 'zod';
import { PARTNER_ACCOUNT_TYPES } from '@gnk/types';
import {
  cnicSchema,
  emailSchema,
  ntnSchema,
  optionalText,
  passwordSchema,
  phonePkSchema,
} from './common';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128),
});
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

const passwordsMatch = { path: ['confirmPassword'], message: 'Passwords do not match' };

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch)
  .refine((v) => v.password !== v.currentPassword, {
    path: ['password'],
    message: 'Choose a new password',
  });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

/** Accept a partner team invite or a staff invite: sets name + password. */
export const acceptInviteSchema = z
  .object({
    token: z.string().min(20).max(200),
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    phone: phonePkSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);
export type AcceptInviteInput = z.input<typeof acceptInviteSchema>;

// Registration — "Become a Partner" (plan 04 §3.1). Agency-only fields are
// required when accountType is AGENCY; CNIC is required for INDIVIDUAL.
export const partnerRegisterSchema = z
  .object({
    accountType: z.enum(PARTNER_ACCOUNT_TYPES),
    // business
    legalName: z.string().trim().max(160).optional(),
    tradeName: optionalText(160),
    dtsLicenseNo: optionalText(40),
    ntn: ntnSchema.optional().or(z.literal('').transform(() => undefined)),
    iataCode: optionalText(12),
    cnic: cnicSchema.optional().or(z.literal('').transform(() => undefined)),
    city: z.string().trim().min(2, 'Enter your city').max(80),
    address: z.string().trim().min(5, 'Enter your office address').max(300),
    officePhone: phonePkSchema.optional().or(z.literal('').transform(() => undefined)),
    // contact
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    mobile: phonePkSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: 'You must accept the terms to continue' }),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
    if (v.accountType === 'AGENCY') {
      if (!v.legalName || v.legalName.length < 2)
        ctx.addIssue({
          code: 'custom',
          path: ['legalName'],
          message: 'Enter the registered agency name',
        });
      if (!v.dtsLicenseNo)
        ctx.addIssue({
          code: 'custom',
          path: ['dtsLicenseNo'],
          message: 'Enter your DTS licence number',
        });
      if (!v.ntn) ctx.addIssue({ code: 'custom', path: ['ntn'], message: 'Enter your NTN' });
    } else if (!v.cnic) {
      ctx.addIssue({ code: 'custom', path: ['cnic'], message: 'Enter your CNIC' });
    }
  });
export type PartnerRegisterInput = z.input<typeof partnerRegisterSchema>;
export type PartnerRegisterData = z.output<typeof partnerRegisterSchema>;

export const themePreferenceSchema = z.object({ theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']) });

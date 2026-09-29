import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../core/config/env.config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Transactional email. No provider is configured yet, so messages are written to
 * the API log (including any action link) and nothing leaves the machine.
 * Swap `deliver()` for Resend/SES/SMTP when a provider is chosen; callers don't change.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger('Mailer');

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  portalUrl(path: string) {
    return this.config.get('PORTAL_URL', { infer: true }).replace(/\/+$/, '') + path;
  }

  adminUrl(path: string) {
    return this.config.get('ADMIN_URL', { infer: true }).replace(/\/+$/, '') + path;
  }

  async send(message: MailMessage): Promise<void> {
    await this.deliver(message);
  }

  private async deliver({ to, subject, text }: MailMessage) {
    this.logger.log(
      `\n──── email (not sent: no provider configured) ────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n──────────────────────────────────────────────`,
    );
  }

  // ---- Templates ----

  verifyEmail(to: string, name: string, token: string) {
    return this.send({
      to,
      subject: 'Verify your email for GNK Connect',
      text: `Hi ${name},\n\nConfirm your email address to finish setting up your partner account:\n${this.portalUrl(`/verify-email?token=${token}`)}\n\nThis link expires in 24 hours.`,
    });
  }

  registrationAttempt(to: string) {
    return this.send({
      to,
      subject: 'Someone tried to register with your email',
      text: `Someone tried to create a GNK Connect partner account with this email address. If it was you, sign in instead:\n${this.portalUrl('/login')}\n\nIf you forgot your password: ${this.portalUrl('/forgot-password')}`,
    });
  }

  passwordReset(to: string, realm: 'PARTNER' | 'STAFF', token: string) {
    const link =
      realm === 'PARTNER'
        ? this.portalUrl(`/reset-password?token=${token}`)
        : this.adminUrl(`/reset-password?token=${token}`);
    return this.send({
      to,
      subject: 'Reset your GNK Connect password',
      text: `Use this link to choose a new password:\n${link}\n\nIt expires in 30 minutes. If you didn't ask for this, ignore this email.`,
    });
  }

  accountLocked(to: string, minutes: number) {
    return this.send({
      to,
      subject: 'Your GNK Connect account was locked',
      text: `We locked your account for ${minutes} minutes after several failed sign-in attempts. If this wasn't you, reset your password once the lock ends.`,
    });
  }

  partnerInvite(to: string, accountName: string, inviter: string, token: string) {
    return this.send({
      to,
      subject: `${inviter} invited you to ${accountName} on GNK Connect`,
      text: `${inviter} invited you to join ${accountName} on GNK Connect.\n\nAccept the invite:\n${this.portalUrl(`/accept-invite?token=${token}`)}\n\nThe link expires in 7 days.`,
    });
  }

  staffInvite(to: string, name: string, token: string) {
    return this.send({
      to,
      subject: 'You have been invited to the GNK Connect admin console',
      text: `Hi ${name},\n\nSet your password to activate your staff account:\n${this.adminUrl(`/accept-invite?token=${token}`)}\n\nThe link expires in 72 hours.`,
    });
  }

  /** Someone created the account with a temporary password (shared with the user separately). */
  accountCreated(to: string, name: string, realm: 'PARTNER' | 'STAFF', createdBy: string) {
    const url = realm === 'PARTNER' ? this.portalUrl('/login') : this.adminUrl('/login');
    return this.send({
      to,
      subject: 'Your GNK Connect account is ready',
      text: `Hi ${name},\n\n${createdBy} created a GNK Connect account for you. Sign in with this email and the temporary password they gave you:\n${url}\n\nYou'll be asked to choose your own password the first time you sign in.`,
    });
  }

  notification(
    to: string,
    title: string,
    body: string,
    link?: string | null,
    realm: 'PARTNER' | 'STAFF' = 'PARTNER',
  ) {
    const url = link ? (realm === 'PARTNER' ? this.portalUrl(link) : this.adminUrl(link)) : null;
    return this.send({ to, subject: title, text: `${body}${url ? `\n\n${url}` : ''}` });
  }
}

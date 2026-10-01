import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../core/config/env.config';
import { toWaNumber } from './wa-number';

/**
 * WhatsApp notifications through the WhatsApp Cloud API (Meta). Business-initiated messages
 * must use a pre-approved template; we use one generic utility template with two body
 * parameters, e.g. "gnk_update":  "*{{1}}*\n{{2}}". Without WHATSAPP_TOKEN and
 * WHATSAPP_PHONE_NUMBER_ID the message is only written to the log.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsApp');

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get enabled() {
    return !!(
      this.config.get('WHATSAPP_TOKEN', { infer: true }) &&
      this.config.get('WHATSAPP_PHONE_NUMBER_ID', { infer: true })
    );
  }

  async send(phone: string, title: string, body: string) {
    const to = toWaNumber(phone);
    if (!to) return this.logger.warn(`Skipped: "${phone}" is not a valid mobile number`);
    const params = [clean(title, 200), clean(body, 900)];
    if (!this.enabled) {
      this.logger.log(`(not sent: WhatsApp not configured) to +${to}: ${params.join(' — ')}`);
      return;
    }
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${this.config.get('WHATSAPP_PHONE_NUMBER_ID', { infer: true })}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.get('WHATSAPP_TOKEN', { infer: true })}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: this.config.get('WHATSAPP_TEMPLATE', { infer: true }),
            language: { code: this.config.get('WHATSAPP_TEMPLATE_LANG', { infer: true }) },
            components: [
              { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
            ],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

/** Template parameters may not contain newlines, tabs or long runs of spaces. */
function clean(text: string, max: number) {
  const t = text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

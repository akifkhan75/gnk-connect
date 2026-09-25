import { Body, Controller, Get, HttpCode, Post, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { EnvConfig } from '../../core/config/env.config';
import { ZodPipe } from '../../core/http/zod.pipe';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Public } from '../auth/decorators';

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT =
  'You are the travel assistant for GNK Connect, a travel agency in Islamabad, Pakistan offering Umrah packages, visit visas, group air tickets, hotels and tours. ' +
  'Answer briefly and helpfully. Do not quote prices or confirm availability; ask the visitor to contact GNK Connect on WhatsApp or the contact page for quotes.';

@Controller()
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }

  /** Website chat widget. The Gemini key stays on the server (plan 04 §8). */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @Post('public/ai/chat')
  @HttpCode(200)
  async chat(@Body(new ZodPipe(chatSchema)) dto: z.output<typeof chatSchema>) {
    const key = this.config.get('GEMINI_API_KEY', { infer: true });
    if (!key) throw new ServiceUnavailableException('The assistant is not available right now');
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: dto.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
          generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    ).catch(() => null);
    if (!res?.ok) throw new ServiceUnavailableException('The assistant is not available right now');
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return { text: text || 'Sorry, I could not answer that. Please contact our team on WhatsApp.' };
  }
}

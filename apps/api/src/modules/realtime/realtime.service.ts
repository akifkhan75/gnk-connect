import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Response } from 'express';
import type { RealtimeEvent } from '@gnk/types';
import { REDIS, type RedisClient } from '../../infra/redis/redis.module';
import type { Actor } from '../auth/auth.types';
import { matches, type Audience } from './audience';

export type { Audience };

interface Envelope {
  audience: Audience[];
  event: RealtimeEvent;
}

interface Connection {
  actor: Actor;
  res: Response;
}

const CHANNEL = 'gnk:realtime';
const HEARTBEAT_MS = 25_000;
// Streams are re-authenticated periodically: the client reconnects with a fresh token,
// so revoked sessions and changed permissions stop receiving events.
const MAX_STREAM_MS = 15 * 60_000;

/**
 * Live updates over Server-Sent Events, fanned out across API instances with Redis pub/sub.
 * Events only say *what* changed; clients refetch through the normal, authorised endpoints.
 */
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly connections = new Set<Connection>();
  private subscriber?: RedisClient;
  private heartbeat?: NodeJS.Timeout;

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async onModuleInit() {
    this.subscriber = this.redis.duplicate() as RedisClient;
    this.subscriber.on('error', (e: Error) => this.logger.error(`Subscriber: ${e.message}`));
    await this.subscriber.connect();
    await this.subscriber.subscribe(CHANNEL, (raw) => this.deliver(raw));
    this.heartbeat = setInterval(() => {
      for (const c of this.connections) c.res.write(': ping\n\n');
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.heartbeat);
    for (const c of this.connections) c.res.end();
    if (this.subscriber?.isOpen) await this.subscriber.quit();
  }

  /** Fire-and-forget: a failed publish must never break the business operation. */
  publish(event: RealtimeEvent, ...audience: Audience[]) {
    const envelope: Envelope = { audience, event };
    void this.redis
      .publish(CHANNEL, JSON.stringify(envelope))
      .catch((e: Error) => this.logger.warn(`Publish failed: ${e.message}`));
  }

  /** Opens an SSE stream for an authenticated actor. */
  open(actor: Actor, res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx: don't buffer
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    res.write(`event: ready\ndata: {}\n\n`);

    const conn: Connection = { actor, res };
    this.connections.add(conn);
    const expire = setTimeout(() => {
      res.write('event: reauth\ndata: {}\n\n');
      res.end();
    }, MAX_STREAM_MS);
    res.on('close', () => {
      clearTimeout(expire);
      this.connections.delete(conn);
    });
  }

  get connectionCount() {
    return this.connections.size;
  }

  private deliver(raw: string) {
    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      return;
    }
    const data = `event: change\ndata: ${JSON.stringify(envelope.event)}\n\n`;
    for (const c of this.connections)
      if (envelope.audience.some((a) => matches(a, c.actor))) c.res.write(data);
  }
}

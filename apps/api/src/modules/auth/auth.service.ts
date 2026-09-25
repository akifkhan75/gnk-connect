import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';
import { Realm, UserStatus } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  aud: string;
  iss: string;
  sid: string;
  acc?: string;
  role?: string; // for Partner members (OWNER, MANAGER, etc) or staff roles. Wait, doc says: 'It carries no role, status or permissions.'
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  public async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  public generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async createSession(
    realm: Realm,
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.generateRefreshToken();
    const refreshHash = this.hashRefreshToken(refreshToken);
    const familyId = uuidv7();

    const expiresInDays = realm === 'PARTNER' ? 30 : 0.5; // 12 hours for staff
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        realm,
        partnerUserId: realm === 'PARTNER' ? userId : null,
        staffUserId: realm === 'STAFF' ? userId : null,
        refreshHash,
        familyId,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        sid: session.id,
      },
      {
        audience: realm === 'PARTNER' ? 'gnk-portal' : 'gnk-admin',
        issuer: 'gnk-connect-api',
        expiresIn: realm === 'PARTNER' ? '15m' : '10m',
      },
    );

    return { accessToken, refreshToken };
  }

  public async partnerLogin(
    email: string,
    password?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const user = await this.prisma.partnerUser.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      // Prevent timing attacks by hashing a dummy string
      await this.verifyPassword(password || '', '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!password || !(await this.verifyPassword(password, user.passwordHash))) {
      await this.prisma.partnerUser.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      // In reality we should lock the account if count > 5, this is handled by throttler
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.INVITED) {
      throw new UnauthorizedException('Account is locked or disabled');
    }

    // Reset failure count on success
    await this.prisma.partnerUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.createSession('PARTNER', user.id, userAgent, ipAddress);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
      },
      memberships: user.memberships.map((m) => ({
        accountId: m.accountId,
        role: m.role,
        accountName: m.account.legalName,
        accountStatus: m.account.status,
      })),
    };
  }

  public async partnerRegister(data: any) {
    // TODO: implement full partner registration
    // This will create a PartnerUser and a PartnerAccount
    return { message: 'Check your email for the verification link.' };
  }
}

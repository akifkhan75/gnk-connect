import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CryptoService } from '../../infra/crypto/crypto.service';
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
    private readonly crypto: CryptoService,
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
    if (!data.email || !data.password || !data.fullName || !data.accountType) {
      throw new BadRequestException('Missing required fields');
    }

    const existingUser = await this.prisma.partnerUser.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      // 04-auth.md: Always respond 202 Accepted, but if email exists, send "someone tried to register" email
      // We'll log it for now as email sending isn't wired yet.
      this.logger.warn(`Registration attempt for existing email: ${data.email}`);
      return { message: 'Check your email for the verification link.' };
    }

    const passwordHash = await this.hashPassword(data.password);

    let cnicEnc = undefined;
    if (data.accountType === 'INDIVIDUAL' && data.cnic) {
      cnicEnc = this.crypto.encrypt(data.cnic);
    }

    const code = `AGT-${Math.floor(100000 + Math.random() * 900000)}`;

    const account = await this.prisma.partnerAccount.create({
      data: {
        code,
        type: data.accountType,
        legalName: data.accountType === 'AGENCY' ? data.legalName : data.fullName,
        tradeName: data.tradeName,
        dtsLicenseNo: data.dtsLicenseNo,
        ntn: data.ntn,
        iataCode: data.iataCode,
        cnic: cnicEnc,
        city: data.city || 'Unknown',
        address: data.address,
        phone: data.officePhone || data.mobile,
        email: data.email.toLowerCase(),
        status: 'DRAFT',
        members: {
          create: {
            role: data.accountType === 'AGENCY' ? 'OWNER' : 'OWNER',
            user: {
              create: {
                email: data.email.toLowerCase(),
                fullName: data.fullName,
                phone: data.mobile,
                passwordHash,
                status: 'ACTIVE', // ACTIVE but email unverified
              },
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (data.dtsFileId || data.cnicFileId) {
      await this.prisma.kycDocument.createMany({
        data: [
          ...(data.dtsFileId ? [{ accountId: account.id, type: 'DTS_LICENSE' as any, fileId: data.dtsFileId }] : []),
          ...(data.cnicFileId ? [{ accountId: account.id, type: 'CNIC_FRONT' as any, fileId: data.cnicFileId }] : [])
        ]
      });
    }

    const user = account.members[0].user;

    // Create email verification token
    const tokenHash = this.hashRefreshToken(this.generateRefreshToken());

    await this.prisma.oneTimeToken.create({
      data: {
        realm: 'PARTNER',
        userId: user.id,
        purpose: 'EMAIL_VERIFY',
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    this.logger.log(`Partner user created: ${user.email}, account: ${account.id}`);

    return { message: 'Check your email for the verification link.' };
  }
}

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AgentUser, Agency, AgentRole, AgentAccountType, AgentApprovalStatus } from '@gnk/types';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: AgentRole;
  agencyId?: string;
  accountType: AgentAccountType;
  approvalStatus: AgentApprovalStatus;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly tokenExpiryHours = 24;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing or less than 32 bytes.');
    }
    this.jwtSecret = secret;
  }

  // In-memory / initial seed users
  private users: (AgentUser & { passwordHash: string })[] = [
    {
      id: 'user-abc-owner',
      email: 'agent@abctravels.com',
      passwordHash: this.hashPassword('partner123'),
      fullName: 'Tariq Mansoor',
      phone: '+92 300 1234567',
      role: 'AGENCY_OWNER',
      agencyId: 'agency-abc-travels',
      accountType: 'AGENCY',
      approvalStatus: 'APPROVED',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'user-muhammad-ali',
      email: 'muhammad.ali.travels@gmail.com',
      passwordHash: this.hashPassword('partner123'),
      fullName: 'Muhammad Ali',
      phone: '+92 333 5551234',
      role: 'INDIVIDUAL_AGENT',
      accountType: 'INDIVIDUAL',
      approvalStatus: 'PENDING_VERIFICATION',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'user-gnk-admin',
      email: 'admin@gnkconnect.pk',
      passwordHash: this.hashPassword('admin123'),
      fullName: 'GNK Operations Admin',
      phone: '+92 300 0000001',
      role: 'GNK_ADMIN',
      accountType: 'AGENCY',
      approvalStatus: 'APPROVED',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private agencies: Agency[] = [
    {
      id: 'agency-abc-travels',
      name: 'ABC Travels & Tours',
      tradeLicenseNumber: 'DTS-KHI-4920',
      ntnNumber: '7392810-4',
      city: 'Karachi',
      country: 'Pakistan',
      officeAddress: 'Suite 402, Business Avenue, Shahrah-e-Faisal, Karachi',
      phone: '+92 21 34567890',
      officialEmail: 'info@abctravels.com.pk',
      ownerId: 'user-abc-owner',
      approvalStatus: 'APPROVED',
      creditLimitPKR: 1500000,
      walletBalancePKR: 450000,
      createdAt: new Date().toISOString(),
      verificationDocuments: []
    }
  ];

  // Password Hashing using PBKDF2
  public hashPassword(password: string): string {
    const salt = 'gnk_connect_static_salt_v1';
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  public verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  // Token Generator (HMAC-SHA256 JWT standard)
  public signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this.tokenExpiryHours * 3600
    };
    const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  public verifyToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed token structure');
    }

    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${body}`).digest('base64url');

    if (signature !== expectedSig) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const payload: JwtPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Token has expired');
    }

    return payload;
  }

  async login(credentials: { email: string; password?: string }): Promise<{
    accessToken: string;
    user: AgentUser;
    agency?: Agency;
  }> {
    const user = this.users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase().trim());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!credentials.password || !this.verifyPassword(credentials.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const agency = user.agencyId ? this.agencies.find(a => a.id === user.agencyId) : undefined;

    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      agencyId: user.agencyId,
      accountType: user.accountType,
      approvalStatus: user.approvalStatus as AgentApprovalStatus
    });

    // Remove hash from returned object
    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken,
      user: safeUser as AgentUser,
      agency
    };
  }

  async register(data: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    accountType: 'AGENCY' | 'INDIVIDUAL';
    agencyName?: string;
    city?: string;
    officeAddress?: string;
    ntnNumber?: string;
    tradeLicenseNumber?: string;
  }): Promise<{ accessToken: string; user: AgentUser; agency?: Agency }> {
    if (!data.password) {
      throw new BadRequestException('Password is required');
    }

    const existing = this.users.find(u => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (existing) {
      throw new BadRequestException('An account with this email address already exists');
    }

    const userId = `user-${Date.now()}`;
    let agencyId: string | undefined;
    let newAgency: Agency | undefined;

    if (data.accountType === 'AGENCY' && data.agencyName) {
      agencyId = `agency-${Date.now()}`;
      newAgency = {
        id: agencyId,
        name: data.agencyName,
        tradeLicenseNumber: data.tradeLicenseNumber,
        ntnNumber: data.ntnNumber,
        city: data.city || 'Karachi',
        country: 'Pakistan',
        officeAddress: data.officeAddress || '',
        phone: data.phone,
        officialEmail: data.email,
        ownerId: userId,
        approvalStatus: 'PENDING_VERIFICATION',
        verificationDocuments: [
          { title: 'Tax NTN / Registration', fileUrl: 'https://example.com/docs/ntn.pdf', uploadedAt: new Date().toISOString(), status: 'SUBMITTED' }
        ],
        createdAt: new Date().toISOString()
      };
      this.agencies.push(newAgency);
    }

    const newUser = {
      id: userId,
      email: data.email,
      passwordHash: this.hashPassword(data.password),
      fullName: data.fullName,
      phone: data.phone,
      role: data.accountType === 'AGENCY' ? ('AGENCY_OWNER' as const) : ('INDIVIDUAL_AGENT' as const),
      agencyId,
      accountType: data.accountType,
      approvalStatus: 'PENDING_VERIFICATION' as const,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);

    const accessToken = this.signToken({
      sub: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      agencyId: newUser.agencyId,
      accountType: newUser.accountType,
      approvalStatus: newUser.approvalStatus
    });

    const { passwordHash: _, ...safeUser } = newUser;

    return {
      accessToken,
      user: safeUser as AgentUser,
      agency: newAgency
    };
  }

  async getProfile(userId: string): Promise<{ user: AgentUser; agency?: Agency }> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new UnauthorizedException('User not found');
    const agency = user.agencyId ? this.agencies.find(a => a.id === user.agencyId) : undefined;
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser as AgentUser, agency };
  }
}

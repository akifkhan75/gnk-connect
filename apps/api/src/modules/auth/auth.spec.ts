import {
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AccessGuard } from './guards/access.guard';
import { RealmAuthGuard } from './guards/realm-auth.guard';
import { AuthCacheService } from './auth-cache.service';
import { ActorResolverService } from './actor-resolver.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { PartnerAuthService } from './partner-auth.service';
import { StaffAuthService } from './staff-auth.service';
import { PERMISSIONS, PARTNER_ROLES, ACCOUNT_STATUS } from './decorators';
import { actorRef } from './auth.types';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { meta, mockPrisma, partner, resStub, silent, staff } from '../../test/helpers';

const ctx = (req: Record<string, unknown>, meta: Record<string, unknown> = {}) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
    ...meta,
  }) as never;

describe('actorRef', () => {
  it('picks realm and user', () => {
    expect(actorRef(partner())).toEqual({ realm: 'PARTNER', userId: 'pu-1' });
  });
});

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes and verifies, and treats bad hashes as false', async () => {
    const hash = await passwords.hash('super-secret-1');
    await expect(passwords.verify(hash, 'super-secret-1')).resolves.toBe(true);
    await expect(passwords.verify(hash, 'wrong')).resolves.toBe(false);
    await expect(passwords.verify('not-a-hash', 'x')).resolves.toBe(false);
  });

  it('flags passwords that contain the email local-part or name', () => {
    expect(passwords.isWeakFor('akifkhan-password', 'akifkhan@gnk.test', 'Sara Ali')).toBe(true);
    expect(passwords.isWeakFor('sara-password-1', 'x@y.z', 'Sara Ali')).toBe(true);
    expect(passwords.isWeakFor('completely-unrelated', 'ab@c.d', 'Jo Li')).toBe(false);
  });
});

describe('AuthCacheService', () => {
  const cache = new AuthCacheService();
  const p = partner();
  const s = staff();

  it('stores, expires, and invalidates', () => {
    cache.set('k', p);
    expect(cache.get('k')).toEqual(p);
    cache.invalidateUser(p.userId);
    expect(cache.get('k')).toBeUndefined();

    cache.set('p', p);
    cache.set('s', s);
    cache.invalidateAccount(p.accountId);
    expect(cache.get('p')).toBeUndefined();
    expect(cache.get('s')).toEqual(s);

    cache.invalidateSession(s.sessionId);
    expect(cache.get('s')).toBeUndefined();
    cache.set('z', p);
    cache.clear();
    expect(cache.get('z')).toBeUndefined();
  });

  it('drops expired entries and clears when oversized', () => {
    jest.useFakeTimers();
    cache.set('old', p);
    jest.setSystemTime(Date.now() + 31_000);
    expect(cache.get('old')).toBeUndefined();
    jest.useRealTimers();
  });
});

describe('AccessGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new AccessGuard(reflector);

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
  });

  it('skips public routes and requires an actor', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true);
    expect(guard.canActivate(ctx({}))).toBe(true);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(() => guard.canActivate(ctx({}))).toThrow(ForbiddenException);
  });

  it('enforces staff permissions and partner role/status', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === PERMISSIONS) return ['bookings:approve'];
      return undefined;
    });
    expect(() => guard.canActivate(ctx({ actor: partner() }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx({ actor: staff([]) }))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ actor: staff() }))).toBe(true);

    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === PARTNER_ROLES) return ['OWNER'];
      if (key === ACCOUNT_STATUS) return ['APPROVED'];
      return undefined;
    });
    expect(() => guard.canActivate(ctx({ actor: staff() }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx({ actor: partner({ role: 'STAFF' }) }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(ctx({ actor: partner({ accountStatus: 'DRAFT' }) }))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(ctx({ actor: partner() }))).toBe(true);
  });
});

describe('RealmAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
  const actors = { partner: jest.fn(), staff: jest.fn() };
  const guard = new RealmAuthGuard(reflector, jwt, actors as never);

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
  });

  it('allows public routes and rejects unknown prefixes', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true);
    await expect(guard.canActivate(ctx({ path: '/api/v1/health' }))).resolves.toBe(true);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(guard.canActivate(ctx({ path: '/api/v1/other' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires a bearer token and maps JWT failures', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(
      guard.canActivate(ctx({ path: '/api/v1/partner/bookings', headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('expired'));
    await expect(
      guard.canActivate(
        ctx({
          path: '/api/v1/partner/bookings',
          headers: { authorization: 'Bearer tok' },
        }),
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'TOKEN_EXPIRED' }) });
  });

  it('loads staff and partner actors and gates password/status', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'u', sid: 's' });
    actors.staff.mockResolvedValue(staff());
    const req: Record<string, unknown> = {
      path: '/api/v1/admin/bookings',
      headers: { authorization: 'Bearer tok' },
    };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.actor).toBeDefined();

    actors.staff.mockResolvedValue(staff());
    (staff() as any).mustChangePassword = true;
    actors.staff.mockResolvedValue({ ...staff(), mustChangePassword: true });
    await expect(
      guard.canActivate(
        ctx({
          path: '/api/v1/admin/bookings',
          headers: { authorization: 'Bearer tok' },
        }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
    });

    actors.partner.mockResolvedValue(partner({ accountStatus: 'SUSPENDED' }));
    await expect(
      guard.canActivate(
        ctx({
          path: '/api/v1/partner/bookings',
          headers: { authorization: 'Bearer tok' },
        }),
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ACCOUNT_SUSPENDED' }) });
  });
});

describe('ActorResolverService', () => {
  it('resolves cached and live partner/staff actors', async () => {
    const prisma = mockPrisma();
    const cache = new AuthCacheService();
    const resolver = new ActorResolverService(prisma as never, cache);
    cache.set('P:sess:', partner());
    await expect(resolver.partner('pu-1', 'sess')).resolves.toMatchObject({ realm: 'PARTNER' });

    cache.clear();
    prisma.session.findUnique.mockResolvedValue({
      id: 'sess',
      realm: 'PARTNER',
      partnerUserId: 'pu-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.partnerUser.findUnique.mockResolvedValue({
      id: 'pu-1',
      email: 'a@b.c',
      fullName: 'A',
      status: 'ACTIVE',
      deletedAt: null,
      mustChangePassword: false,
      memberships: [
        {
          accountId: 'acc-1',
          role: 'OWNER',
          account: {
            deletedAt: null,
            code: 'AGT-1',
            tradeName: 'Al',
            legalName: 'Al Noor',
            type: 'AGENCY',
            status: 'APPROVED',
          },
        },
      ],
    });
    await expect(resolver.partner('pu-1', 'sess', 'acc-1')).resolves.toMatchObject({
      accountId: 'acc-1',
    });

    prisma.session.findUnique.mockResolvedValue({
      id: 'ss',
      realm: 'STAFF',
      staffUserId: 'su-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.staffUser.findUnique.mockResolvedValue({
      id: 'su-1',
      email: 's@c.d',
      fullName: 'S',
      status: 'ACTIVE',
      deletedAt: null,
      mustChangePassword: false,
      roles: [
        {
          role: {
            key: 'SUPER_ADMIN',
            permissions: [{ permission: { key: 'bookings:read' } }],
          },
        },
      ],
    });
    await expect(resolver.staff('su-1', 'ss')).resolves.toMatchObject({ realm: 'STAFF' });
  });

  it('rejects dead sessions and users', async () => {
    const prisma = mockPrisma();
    const resolver = new ActorResolverService(prisma as never, new AuthCacheService());
    prisma.session.findUnique.mockResolvedValue(null);
    await expect(resolver.partner('pu-1', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('SessionService', () => {
  const prisma = mockPrisma();
  const jwt = { sign: jest.fn(() => 'jwt') };
  const cache = new AuthCacheService();
  const config = {
    get: (k: string) =>
      k === 'NODE_ENV' ? 'test' : k === 'CORS_ORIGINS' ? 'http://localhost:3001' : k,
  };
  const sessions = new SessionService(
    prisma as never,
    jwt as never,
    cache,
    { log: silent.log } as never,
    config as never,
  );

  it('issues, lists, reissues, and revokes sessions', async () => {
    prisma.session.create.mockResolvedValue({ id: 'sid-1' });
    const res = resStub();
    const tokens = await sessions.start('PARTNER', 'pu-1', meta, res as never, 'acc-1');
    expect(tokens.accessToken).toBe('jwt');
    expect(res.cookie).toHaveBeenCalled();

    prisma.session.findUnique.mockResolvedValue({ familyId: 'fam' });
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'sid-1',
        familyId: 'fam',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        lastUsedAt: new Date(),
      },
    ]);
    const listed = await sessions.list('PARTNER', 'pu-1', 'sid-1');
    expect(listed[0].current).toBe(true);

    expect(sessions.reissueAccess('STAFF', 'su-1', 'sid-1').sessionId).toBe('sid-1');

    prisma.session.findUnique.mockResolvedValue({ partnerUserId: 'pu-1', familyId: 'fam' });
    prisma.session.findMany.mockResolvedValue([{ id: 'sid-1' }]);
    await sessions.revokeOne('PARTNER', 'pu-1', 'sid-1');
    await sessions.revokeAllForUser('PARTNER', 'pu-1', 'password_change');
  });

  it('blocks CSRF-less refresh and logout', async () => {
    const res = resStub();
    await expect(
      sessions.refresh('PARTNER', { headers: {}, cookies: {} } as never, res as never, meta),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refreshes, logs out, and rejects reused tokens', async () => {
    const okReq = {
      headers: { 'x-gnk-csrf': '1', origin: 'http://localhost:3001' },
      cookies: { gnk_prt_rt: 'refresh-token' },
    };
    prisma.session.findUnique.mockResolvedValue({
      id: 'sid',
      realm: 'PARTNER',
      partnerUserId: 'pu-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      familyId: 'fam',
    });
    prisma.session.create.mockResolvedValue({ id: 'sid-2' });
    const rotated = await sessions.refresh('PARTNER', okReq as never, resStub() as never, meta);
    expect(rotated.userId).toBe('pu-1');

    prisma.session.findUnique.mockResolvedValue({ id: 'sid', familyId: 'fam' });
    prisma.session.findMany.mockResolvedValue([{ id: 'sid' }]);
    await sessions.logout('PARTNER', okReq as never, resStub() as never);

    prisma.session.findUnique.mockResolvedValue({
      id: 'sid',
      realm: 'PARTNER',
      partnerUserId: 'pu-1',
      revokedAt: new Date(),
      revokedReason: 'rotated',
      familyId: 'fam',
    });
    await expect(
      sessions.refresh('PARTNER', okReq as never, resStub() as never, meta),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('PartnerAuthService', () => {
  const prisma = mockPrisma();
  const passwords = {
    hash: jest.fn().mockResolvedValue('hash'),
    verify: jest.fn(),
    isWeakFor: jest.fn().mockReturnValue(false),
  };
  const sessions = {
    start: jest.fn().mockResolvedValue({ accessToken: 't', expiresIn: 1 }),
    revokeAllForUser: jest.fn(),
  };
  const crypto = { encrypt: jest.fn((v: string) => `enc:${v}`), newToken: undefined };
  const mailer = {
    registrationAttempt: jest.fn(),
    verifyEmail: jest.fn(),
    accountLocked: jest.fn(),
    passwordReset: jest.fn(),
    partnerInvite: jest.fn(),
  };
  const sequences = { next: jest.fn().mockResolvedValue('AGT-000009') };
  const cache = new AuthCacheService();
  const service = new PartnerAuthService(
    prisma as never,
    passwords as never,
    sessions as never,
    crypto as never,
    mailer as never,
    { log: jest.fn() } as never,
    sequences as never,
    cache,
  );

  it('does not leak existing emails on register', async () => {
    prisma.partnerUser.findUnique.mockResolvedValue({ id: 'u' });
    const out = await service.register(
      {
        email: 'a@b.c',
        password: 'long-password',
        fullName: 'A',
        accountType: 'INDIVIDUAL',
      } as never,
      meta,
    );
    expect(out.message).toMatch(/Account created/);
    expect(mailer.registrationAttempt).toHaveBeenCalled();
  });

  it('rejects weak passwords on register', async () => {
    prisma.partnerUser.findUnique.mockResolvedValue(null);
    passwords.isWeakFor.mockReturnValueOnce(true);
    await expect(
      service.register(
        { email: 'a@b.c', password: 'aaaaaaa', fullName: 'A', accountType: 'INDIVIDUAL' } as never,
        meta,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('creates an agency account', async () => {
    prisma.partnerUser.findUnique.mockResolvedValue(null);
    passwords.isWeakFor.mockReturnValue(false);
    const created = {
      id: 'acc',
      code: 'AGT-000009',
      type: 'AGENCY',
      legalName: 'Al',
      members: [{ user: { id: 'u', email: 'a@b.c', fullName: 'A' } }],
    };
    prisma.partnerAccount.create.mockResolvedValue(created);
    prisma.oneTimeToken.create.mockResolvedValue({});
    jest.spyOn(CryptoService, 'newToken').mockReturnValue({
      token: 'tok',
      hash: 'hash',
    });
    await service.register(
      {
        email: 'a@b.c',
        password: 'long-password',
        fullName: 'Ali Khan',
        accountType: 'AGENCY',
        legalName: 'Al Noor',
        city: 'Lahore',
        address: 'Street',
        mobile: '+923001234567',
      } as never,
      meta,
    );
    expect(prisma.partnerAccount.create).toHaveBeenCalled();
  });

  it('login paths: unknown, locked, bad password, disabled, success', async () => {
    passwords.verify.mockResolvedValue(false);
    prisma.partnerUser.findUnique.mockResolvedValue(null);
    await expect(service.login('a@b.c', 'x', meta, resStub() as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.partnerUser.findUnique.mockResolvedValue({
      id: 'u',
      deletedAt: null,
      lockedUntil: new Date(Date.now() + 60_000),
      failedLoginCount: 5,
      passwordHash: 'h',
    });
    await expect(service.login('a@b.c', 'x', meta, resStub() as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prisma.partnerUser.findUnique.mockResolvedValue({
      id: 'u',
      deletedAt: null,
      lockedUntil: null,
      failedLoginCount: 4,
      passwordHash: 'h',
      email: 'a@b.c',
      status: 'ACTIVE',
    });
    passwords.verify.mockResolvedValueOnce(false);
    await expect(service.login('a@b.c', 'x', meta, resStub() as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mailer.accountLocked).toHaveBeenCalled();
  });

  const memberships = [
    {
      accountId: 'acc-1',
      role: 'OWNER',
      account: {
        deletedAt: null,
        code: 'AGT-1',
        tradeName: 'Al',
        legalName: 'Al',
        status: 'APPROVED',
        type: 'AGENCY',
      },
    },
  ];
  const activeUser = {
    id: 'u',
    email: 'a@b.c',
    fullName: 'Ali',
    phone: '1',
    emailVerifiedAt: new Date(),
    themePreference: 'SYSTEM',
    mustChangePassword: false,
    deletedAt: null,
    lockedUntil: null,
    failedLoginCount: 0,
    passwordHash: 'h',
    status: 'ACTIVE',
    memberships,
  };

  it('logs in, builds a session, and manages profile/security', async () => {
    passwords.verify.mockResolvedValue(true);
    passwords.isWeakFor.mockReturnValue(false);
    prisma.partnerUser.findUnique.mockResolvedValue(activeUser);
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue(activeUser);
    const out = await service.login('a@b.c', 'ok', meta, resStub() as never);
    expect(out.accessToken).toBe('t');
    expect(out.session.account.accountId).toBe('acc-1');

    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      ...activeUser,
      emailVerifiedAt: new Date(),
    });
    await expect(service.resendVerification(partner())).resolves.toMatchObject({
      message: expect.stringMatching(/already verified/),
    });
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      ...activeUser,
      emailVerifiedAt: null,
    });
    await expect(service.resendVerification(partner())).resolves.toMatchObject({
      message: expect.stringMatching(/new verification/),
    });

    await service.updateMe(partner(), { fullName: 'Ali', phone: '2' } as never);
    await expect(service.setTheme(partner(), 'DARK')).resolves.toEqual({ theme: 'DARK' });

    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue(activeUser);
    passwords.verify.mockResolvedValueOnce(true);
    prisma.session.findUnique.mockResolvedValue({ familyId: 'fam' });
    await service.changePassword(
      partner(),
      { currentPassword: 'old', password: 'new-password-ok' } as never,
      meta,
    );

    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      ...activeUser,
      mustChangePassword: true,
    });
    passwords.verify.mockResolvedValueOnce(false);
    await service.setInitialPassword(partner(), { password: 'brand-new-pass' } as never, meta);
  });

  it('verifies email, resets passwords, and accepts invites', async () => {
    prisma.oneTimeToken.findUnique.mockResolvedValue({
      id: 'tok',
      userId: 'u',
      realm: 'PARTNER',
      purpose: 'EMAIL_VERIFY',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await service.verifyEmail('token-value');

    prisma.partnerUser.findUnique.mockResolvedValue(activeUser);
    await service.forgotPassword('a@b.c');
    await service.forgotPassword('missing@x.test');

    prisma.oneTimeToken.findUnique.mockResolvedValue({
      id: 'tok',
      userId: 'u',
      realm: 'PARTNER',
      purpose: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue(activeUser);
    passwords.isWeakFor.mockReturnValue(false);
    await service.resetPassword(
      { token: 'reset-token', password: 'new-password-ok' } as never,
      meta,
    );

    prisma.partnerInvite.findUnique.mockResolvedValue({
      id: 'inv',
      accountId: 'acc-1',
      email: 'new@b.c',
      role: 'STAFF',
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdById: 'pu-1',
    });
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue({
      tradeName: 'Al',
      legalName: 'Al',
    });
    prisma.partnerUser.findUnique.mockResolvedValue(null);
    await service.lookupInvite('invite-token');

    prisma.partnerUser.findUnique.mockResolvedValue(null);
    prisma.partnerUser.create.mockResolvedValue({ id: 'u2', email: 'new@b.c' });
    prisma.partnerMember.findUnique.mockResolvedValue(null);
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      ...activeUser,
      id: 'u2',
      email: 'new@b.c',
    });
    await service.acceptInvite(
      { token: 'invite-token', password: 'long-password', fullName: 'New User' },
      meta,
      resStub() as never,
    );

    prisma.partnerInvite.findUnique.mockResolvedValue({
      id: 'inv',
      accountId: 'acc-1',
      email: 'a@b.c',
      role: 'STAFF',
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdById: 'pu-1',
    });
    prisma.partnerUser.findUnique.mockResolvedValue(activeUser);
    passwords.verify.mockResolvedValueOnce(true);
    prisma.partnerMember.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue(activeUser);
    await service.acceptInvite(
      { token: 'invite-token', password: 'current-pass' },
      meta,
      resStub() as never,
    );
  });
});

describe('StaffAuthService', () => {
  const prisma = mockPrisma();
  const passwords = {
    verify: jest.fn(),
    hash: jest.fn().mockResolvedValue('hash'),
    isWeakFor: jest.fn().mockReturnValue(false),
  };
  const sessions = {
    start: jest.fn().mockResolvedValue({ accessToken: 't', expiresIn: 1 }),
    revokeAllForUser: jest.fn(),
  };
  const mailer = { accountLocked: jest.fn(), passwordReset: jest.fn() };
  const service = new StaffAuthService(
    prisma as never,
    passwords as never,
    sessions as never,
    mailer as never,
    { log: jest.fn() } as never,
    new AuthCacheService(),
  );
  const staffUser = {
    id: 'su-1',
    email: 'admin@x.test',
    fullName: 'Admin',
    themePreference: 'SYSTEM',
    mustChangePassword: false,
    deletedAt: null,
    lockedUntil: null,
    failedLoginCount: 0,
    passwordHash: 'h',
    status: 'ACTIVE',
    roles: [
      {
        role: {
          key: 'SUPER_ADMIN',
          permissions: [{ permission: { key: 'dashboard:view' } }],
        },
      },
    ],
  };

  it('rejects unknown staff logins and succeeds for active staff', async () => {
    prisma.staffUser.findUnique.mockResolvedValue(null);
    await expect(
      service.login('admin@x.test', 'nope', meta, resStub() as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.staffUser.findUnique.mockResolvedValue(staffUser);
    prisma.staffUser.findUniqueOrThrow.mockResolvedValue(staffUser);
    passwords.verify.mockResolvedValue(true);
    const out = await service.login('admin@x.test', 'ok', meta, resStub() as never);
    expect(out.session.realm).toBe('STAFF');
  });

  it('covers password reset, invite, and profile paths', async () => {
    prisma.staffUser.findUnique.mockResolvedValue(staffUser);
    await service.forgotPassword('admin@x.test');

    prisma.oneTimeToken.findUnique.mockResolvedValue({
      id: 'tok',
      userId: 'su-1',
      realm: 'STAFF',
      purpose: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.staffUser.findUniqueOrThrow.mockResolvedValue(staffUser);
    await service.resetPassword({ token: 't', password: 'new-password-ok' } as never, meta);

    prisma.oneTimeToken.findUnique.mockResolvedValue({
      id: 'inv',
      userId: 'su-1',
      realm: 'STAFF',
      purpose: 'STAFF_INVITE',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.staffUser.findUniqueOrThrow.mockResolvedValue({ ...staffUser, status: 'INVITED' });
    await service.lookupInvite('invite');
    await service.acceptInvite(
      { token: 'invite', password: 'long-password', fullName: 'Admin' } as never,
      meta,
      resStub() as never,
    );

    prisma.staffUser.findUniqueOrThrow.mockResolvedValue(staffUser);
    passwords.verify.mockResolvedValueOnce(true);
    prisma.session.findUnique.mockResolvedValue({ familyId: 'fam' });
    await service.changePassword(
      staff(),
      { currentPassword: 'old', password: 'new-password-ok' } as never,
      meta,
    );

    prisma.staffUser.findUniqueOrThrow.mockResolvedValue({
      ...staffUser,
      mustChangePassword: true,
    });
    passwords.verify.mockResolvedValueOnce(false);
    await service.setInitialPassword(staff(), { password: 'brand-new-pass' } as never, meta);
    await service.setTheme(staff(), 'LIGHT');
  });
});

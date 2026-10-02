import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthCacheService } from '../auth/auth-cache.service';
import { StaffService } from './staff.service';
import { PermissionsSyncService } from './permissions-sync.service';
import { meta, mockPrisma, staff } from '../../test/helpers';

describe('StaffService coverage', () => {
  const prisma = mockPrisma();
  const mailer = { staffInvite: jest.fn(), accountCreated: jest.fn(), passwordReset: jest.fn() };
  const svc = new StaffService(
    prisma as never,
    mailer as never,
    { log: jest.fn() } as never,
    new AuthCacheService(),
    { revokeAllForUser: jest.fn() } as never,
    { hash: jest.fn().mockResolvedValue('h') } as never,
  );

  const dtoUser = {
    id: 'su-2',
    email: 'ops@gnk.test',
    fullName: 'Ops',
    status: 'INVITED',
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date(),
    roles: [{ role: { key: 'SUPPORT', permissions: [] } }],
  };

  it('creates, updates, resets, and manages roles', async () => {
    prisma.staffUser.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([{ id: 'r-support', key: 'SUPPORT', permissions: [] }]);
    prisma.staffUser.create.mockResolvedValue(dtoUser);
    await svc.create(
      staff(),
      { email: 'ops@gnk.test', fullName: 'Ops', roles: ['SUPPORT'], mode: 'invite' } as never,
      meta,
    );
    prisma.staffUser.create.mockResolvedValue({ ...dtoUser, status: 'ACTIVE' });
    await svc.create(
      staff(),
      {
        email: 'pw@gnk.test',
        fullName: 'Pw',
        roles: ['SUPPORT'],
        mode: 'password',
        password: 'temp-pass-1',
      } as never,
      meta,
    );

    prisma.staffUser.findUnique.mockResolvedValue(dtoUser);
    await svc.resendInvite('su-2');

    prisma.staffUser.findUnique.mockResolvedValue({
      ...dtoUser,
      deletedAt: null,
      status: 'ACTIVE',
      roles: [
        { role: { key: 'SUPPORT', permissions: [{ permission: { key: 'dashboard:view' } }] } },
      ],
    });
    prisma.staffUser.findUniqueOrThrow.mockResolvedValue({
      ...dtoUser,
      status: 'ACTIVE',
      roles: [{ role: { key: 'SUPPORT' } }],
    });
    await svc.update(staff(), 'su-2', { fullName: 'Ops Two' } as never, meta);

    prisma.staffUser.findUnique.mockResolvedValue({
      ...dtoUser,
      deletedAt: null,
      roles: [{ role: { key: 'SUPPORT', permissions: [] } }],
    });
    await svc.resetPassword(staff(), 'su-2', { mode: 'link' } as never, meta);
    await svc.resetPassword(
      staff(),
      'su-2',
      { mode: 'password', password: 'temp-2' } as never,
      meta,
    );

    prisma.role.findMany.mockResolvedValue([
      {
        id: 'r1',
        key: 'SUPPORT',
        name: 'Support',
        description: null,
        isSystem: true,
        permissions: [{ permission: { key: 'dashboard:view' } }],
        _count: { users: 1 },
      },
    ]);
    expect((await svc.roles())[0].key).toBe('SUPPORT');

    prisma.role.findFirst.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([{ id: 'p1', key: 'dashboard:view' }]);
    prisma.role.create.mockResolvedValue({ id: 'r-custom' });
    await svc.createRole(
      staff(),
      { name: 'Custom Ops', description: null, permissions: ['dashboard:view'] } as never,
      meta,
    );

    prisma.role.findUnique.mockResolvedValue({
      id: 'r-custom',
      isSystem: false,
      name: 'Custom Ops',
      permissions: [{ permission: { key: 'dashboard:view' } }],
      users: [],
    });
    prisma.role.findFirst.mockResolvedValue(null);
    await svc.updateRole(
      staff(),
      'r-custom',
      { name: 'Custom Ops', description: 'x', permissions: ['dashboard:view'] } as never,
      meta,
    );
    prisma.role.findUnique.mockResolvedValue({
      id: 'r-custom',
      isSystem: false,
      name: 'Custom Ops',
      _count: { users: 0 },
    });
    await svc.deleteRole(staff(), 'r-custom', meta);
  });

  it('guards create/update/role errors', async () => {
    prisma.staffUser.findUnique.mockResolvedValue({ id: 'exists' });
    await expect(
      svc.create(staff(), { email: 'x@y.z', fullName: 'X', roles: ['SUPPORT'] } as never, meta),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.staffUser.findUnique.mockResolvedValue({ id: 'su-1', status: 'ACTIVE' });
    await expect(svc.resendInvite('su-1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.staffUser.findUnique.mockResolvedValue(null);
    await expect(svc.update(staff(), 'missing', {} as never, meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.role.findUnique.mockResolvedValue(null);
    await expect(svc.deleteRole(staff(), 'missing', meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.role.findUnique.mockResolvedValue({
      id: 'sys',
      isSystem: true,
      _count: { users: 0 },
    });
    await expect(svc.deleteRole(staff(), 'sys', meta)).rejects.toBeInstanceOf(BadRequestException);
    prisma.role.findUnique.mockResolvedValue({
      id: 'used',
      isSystem: false,
      _count: { users: 2 },
    });
    await expect(svc.deleteRole(staff(), 'used', meta)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('PermissionsSyncService', () => {
  it('swallows a failed bootstrap sync', async () => {
    const prisma = mockPrisma();
    prisma.permission.upsert.mockRejectedValue(new Error('db down'));
    const sync = new PermissionsSyncService(prisma as never, { clear: jest.fn() } as never);
    await sync.onApplicationBootstrap();
    expect(prisma.permission.upsert).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { BaseRepository } from './base.repository';

import { Injectable } from '@nestjs/common';

@Injectable()
class TestRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'testModel');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestRepository,
        {
          provide: PrismaService,
          useValue: {
            testModel: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<TestRepository>(TestRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find by id without tenant scoping', async () => {
      const expected = { id: '1' };
      (prisma as any).testModel.findFirst.mockResolvedValue(expected);

      const result = await repository.findById('1');
      expect(result).toEqual(expected);
      expect((prisma as any).testModel.findFirst).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should find by id with tenant scoping', async () => {
      const expected = { id: '1', accountId: 'tenant-1' };
      (prisma as any).testModel.findFirst.mockResolvedValue(expected);

      const result = await repository.findById('1', 'tenant-1');
      expect(result).toEqual(expected);
      expect((prisma as any).testModel.findFirst).toHaveBeenCalledWith({
        where: { id: '1', accountId: 'tenant-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should throw if record not found', async () => {
      (prisma as any).testModel.findFirst.mockResolvedValue(null);

      await expect(repository.softDelete('1')).rejects.toThrow('Record not found or access denied');
    });

    it('should update deletedAt on successful soft delete', async () => {
      (prisma as any).testModel.findFirst.mockResolvedValue({ id: '1' });
      (prisma as any).testModel.update.mockResolvedValue({ id: '1', deletedAt: new Date() });

      const result = await repository.softDelete('1');
      expect(result).toHaveProperty('deletedAt');
      expect((prisma as any).testModel.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

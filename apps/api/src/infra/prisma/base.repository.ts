import { PrismaService } from './prisma.service';

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  async findById(id: string, tenantId?: string): Promise<T | null> {
    const where: any = { id };
    if (tenantId) {
      where.accountId = tenantId;
    }

    // Add deletedAt IS NULL if the model supports soft deletes
    // For a fully dynamic base repo, we would check if deletedAt exists,
    // but in a typed generic repo it's usually handled by Prisma Client extensions or explicit conditions

    return this.model.findFirst({ where });
  }

  async findMany(where: any = {}, tenantId?: string): Promise<T[]> {
    if (tenantId) {
      where.accountId = tenantId;
    }
    return this.model.findMany({ where });
  }

  async create(data: CreateDTO, tenantId?: string): Promise<T> {
    const createData: any = { ...data };
    if (tenantId) {
      createData.accountId = tenantId;
    }
    return this.model.create({ data: createData });
  }

  async update(id: string, data: UpdateDTO, tenantId?: string): Promise<T> {
    const where: any = { id };
    if (tenantId) {
      where.accountId = tenantId;
    }

    // First ensure it exists and belongs to the tenant
    const exists = await this.model.findFirst({ where });
    if (!exists) {
      throw new Error('Record not found or access denied');
    }

    return this.model.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, tenantId?: string): Promise<T> {
    const where: any = { id };
    if (tenantId) {
      where.accountId = tenantId;
    }

    const exists = await this.model.findFirst({ where });
    if (!exists) {
      throw new Error('Record not found or access denied');
    }

    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

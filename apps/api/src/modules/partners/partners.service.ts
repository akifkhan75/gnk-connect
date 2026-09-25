import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Admin Methods ---

  async getAllPartners() {
    return this.prisma.partnerAccount.findMany({
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async updateApprovalStatus(
    accountId: string,
    status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'MORE_INFO_REQUIRED',
    reason?: string,
  ) {
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Partner account not found');
    }

    return this.prisma.partnerAccount.update({
      where: { id: accountId },
      data: {
        status,
        // Optional: save reason in an audit log or a dedicated column
      },
    });
  }

  // --- Partner Portal Methods ---

  async getAccount(accountId: string) {
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async submitAccount(accountId: string) {
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) throw new NotFoundException('Account not found');

    if (account.status !== 'DRAFT' && account.status !== 'MORE_INFO_REQUIRED') {
      throw new BadRequestException('Account is not in a valid state for submission');
    }

    return this.prisma.partnerAccount.update({
      where: { id: accountId },
      data: { status: 'SUBMITTED' },
    });
  }

  async updateProfile(accountId: string, data: any) {
    // Only allow updating non-critical fields for now
    const safeData = {
      address: data.address,
      city: data.city,
      phone: data.phone,
    };

    return this.prisma.partnerAccount.update({
      where: { id: accountId },
      data: safeData,
    });
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

  // --- Partner Team Methods ---

  async getTeamMembers(accountId: string) {
    return this.prisma.partnerMember.findMany({
      where: { accountId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
          },
        },
      },
    });
  }

  async inviteMember(accountId: string, actorId: string, actorRole: string, data: any) {
    // Only AGENCY accounts can have multiple members
    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
    });
    if (account?.type !== 'AGENCY') {
      throw new BadRequestException('Only agency accounts can invite multiple members');
    }

    // MANAGER cannot invite an OWNER
    if (actorRole === 'MANAGER' && data.role === 'OWNER') {
      throw new ForbiddenException('Managers cannot invite owners');
    }

    // Stub for now. Real implementation needs to create an INVITED user and send an email
    throw new BadRequestException('Invite implementation pending email service integration');
  }

  async updateMemberRole(
    accountId: string,
    actorId: string,
    actorRole: string,
    targetUserId: string,
    newRole: string,
  ) {
    // Managers cannot promote someone to OWNER or demote an OWNER
    if (actorRole === 'MANAGER' && newRole === 'OWNER') {
      throw new ForbiddenException('Managers cannot grant owner role');
    }

    const targetMember = await this.prisma.partnerMember.findUnique({
      where: { accountId_userId: { userId: targetUserId, accountId } },
    });

    if (!targetMember) throw new NotFoundException('Team member not found');
    if (actorRole === 'MANAGER' && targetMember.role === 'OWNER') {
      throw new ForbiddenException('Managers cannot modify owner roles');
    }

    return this.prisma.partnerMember.update({
      where: { accountId_userId: { userId: targetUserId, accountId } },
      data: { role: newRole as any },
    });
  }

  async removeMember(accountId: string, actorId: string, actorRole: string, targetUserId: string) {
    if (actorId === targetUserId) {
      throw new BadRequestException('You cannot remove yourself');
    }

    const targetMember = await this.prisma.partnerMember.findUnique({
      where: { accountId_userId: { userId: targetUserId, accountId } },
    });

    if (!targetMember) throw new NotFoundException('Team member not found');
    if (actorRole === 'MANAGER' && targetMember.role === 'OWNER') {
      throw new ForbiddenException('Managers cannot remove an owner');
    }

    return this.prisma.partnerMember.delete({
      where: { accountId_userId: { userId: targetUserId, accountId } },
    });
  }
}

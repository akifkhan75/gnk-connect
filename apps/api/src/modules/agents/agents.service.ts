import { Injectable } from '@nestjs/common';
import { AgentUser, Agency } from '@gnk/types';

@Injectable()
export class AgentsService {
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

  private users: AgentUser[] = [
    {
      id: 'user-abc-owner',
      email: 'agent@abctravels.com',
      fullName: 'Tariq Mansoor',
      phone: '+92 300 1234567',
      role: 'AGENCY_OWNER',
      agencyId: 'agency-abc-travels',
      accountType: 'AGENCY',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  getAllAgents() {
    return this.users;
  }

  getAgencies() {
    return this.agencies;
  }

  updateApprovalStatus(userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.approvalStatus = status;
      if (user.agencyId) {
        const agency = this.agencies.find(a => a.id === user.agencyId);
        if (agency) agency.approvalStatus = status;
      }
    }
    return user;
  }
}

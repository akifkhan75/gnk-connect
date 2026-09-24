import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentUser, Agency, AdminRole } from '@gnk/types';
import { b2bStore } from '@gnk/api-client';
import { authApi, apiClient } from '@gnk/api-client';

interface B2BAuthContextType {
  currentUser: AgentUser | null;
  currentAgency: Agency | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  isApprovedAgent: boolean;
  isPendingAgent: boolean;
  isAgencyOwner: boolean;
  isAgencyManager: boolean;
  isAgencyStaff: boolean;
  isIndividualAgent: boolean;
  canManageTeam: boolean;
  canViewFinances: boolean;
  canBook: boolean;
  canVerifyPayments: boolean;
  canPushToAirDesk: boolean;
  canApproveAgents: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (data: any) => Promise<AgentUser>;
  logout: () => void;
  switchUser: (userId: string) => void;
  availableUsers: AgentUser[];
}

const B2BAuthContext = createContext<B2BAuthContextType | undefined>(undefined);

export const B2BAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AgentUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AgentUser[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      const users = b2bStore.getUsers();
      setAvailableUsers(users);

      // Check for saved session or default to ABC Travels owner
      const savedUserId = localStorage.getItem('gnk_b2b_current_user_id');
      if (savedUserId) {
        const found = users.find(u => u.id === savedUserId);
        if (found) {
          setCurrentUser(found);
          return;
        }
      }
      // Default to ABC Travels Approved Agency Owner (DEV only)
      if (import.meta.env.DEV) {
        const defaultUser = users.find(u => u.id === 'user-abc-owner') || users[0] || null;
        if (defaultUser) {
          setCurrentUser(defaultUser);
          localStorage.setItem('gnk_b2b_current_user_id', defaultUser.id);
        }
      }
    };

    updateUsers();
    return b2bStore.subscribe(updateUsers);
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      // 1. Try real NestJS Auth API first
      const res = await authApi.login({ email, password });
      if (res && res.accessToken) {
        apiClient.setToken(res.accessToken);
        setCurrentUser(res.user);
        localStorage.setItem('gnk_b2b_current_user_id', res.user.id);
        return true;
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        const users = b2bStore.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('gnk_b2b_current_user_id', user.id);
          return true;
        }
      }
      throw e;
    }

    return false;
  };

  const register = async (data: any): Promise<AgentUser> => {
    try {
      // 1. Try real NestJS Auth API first
      const res = await authApi.register(data);
      if (res && res.accessToken) {
        apiClient.setToken(res.accessToken);
        setCurrentUser(res.user);
        localStorage.setItem('gnk_b2b_current_user_id', res.user.id);
        return res.user;
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        const newUser = b2bStore.registerAgent(data);
        setCurrentUser(newUser);
        localStorage.setItem('gnk_b2b_current_user_id', newUser.id);
        return newUser;
      }
      throw e;
    }

    throw new Error('Registration failed');
  };

  const logout = () => {
    setCurrentUser(null);
    apiClient.setToken(null);
    localStorage.removeItem('gnk_b2b_current_user_id');
  };

  const switchUser = (userId: string) => {
    const users = b2bStore.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('gnk_b2b_current_user_id', user.id);
    }
  };

  const currentAgency = currentUser?.agencyId 
    ? b2bStore.getAgencyById(currentUser.agencyId) || null 
    : null;

  const isAdmin = currentUser?.role === 'GNK_ADMIN';
  const adminRole: AdminRole | null = isAdmin ? (currentUser?.adminRole || 'SUPER_ADMIN') : null;
  const isApprovedAgent = currentUser?.approvalStatus === 'APPROVED';
  const isPendingAgent = currentUser?.approvalStatus === 'PENDING_VERIFICATION' || currentUser?.approvalStatus === 'ADMIN_REVIEW';

  const isAgencyOwner = currentUser?.role === 'AGENCY_OWNER';
  const isAgencyManager = currentUser?.role === 'AGENCY_MANAGER';
  const isAgencyStaff = currentUser?.role === 'AGENCY_STAFF';
  const isIndividualAgent = currentUser?.role === 'INDIVIDUAL_AGENT';

  // Permissions RBAC
  const canManageTeam = isAgencyOwner || (isAdmin && adminRole === 'SUPER_ADMIN');
  const canViewFinances = isAgencyOwner || isAgencyManager || isIndividualAgent || isAdmin;
  const canBook = isApprovedAgent;
  const canVerifyPayments = isAdmin && (adminRole === 'SUPER_ADMIN' || adminRole === 'FINANCE_ADMIN');
  const canPushToAirDesk = isAdmin && (adminRole === 'SUPER_ADMIN' || adminRole === 'OPS_ADMIN');
  const canApproveAgents = isAdmin && (adminRole === 'SUPER_ADMIN' || adminRole === 'AGENT_MANAGER');

  return (
    <B2BAuthContext.Provider
      value={{
        currentUser,
        currentAgency,
        isAdmin,
        adminRole,
        isApprovedAgent,
        isPendingAgent,
        isAgencyOwner,
        isAgencyManager,
        isAgencyStaff,
        isIndividualAgent,
        canManageTeam,
        canViewFinances,
        canBook,
        canVerifyPayments,
        canPushToAirDesk,
        canApproveAgents,
        login,
        register,
        logout,
        switchUser,
        availableUsers
      }}
    >
      {children}
    </B2BAuthContext.Provider>
  );
};

export const useB2BAuth = (): B2BAuthContextType => {
  const context = useContext(B2BAuthContext);
  if (!context) {
    throw new Error('useB2BAuth must be used within a B2BAuthProvider');
  }
  return context;
};

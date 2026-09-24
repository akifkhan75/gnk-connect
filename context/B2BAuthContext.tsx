import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentUser, Agency } from '../types/b2b';
import { b2bStore } from '../services/b2b/b2bStore';
import { authApi, apiClient } from '../services/apiClient';

interface B2BAuthContextType {
  currentUser: AgentUser | null;
  currentAgency: Agency | null;
  isAdmin: boolean;
  isApprovedAgent: boolean;
  isPendingAgent: boolean;
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
      // Default to ABC Travels Approved Agency
      const defaultUser = users.find(u => u.id === 'user-abc-owner') || users[0] || null;
      if (defaultUser) {
        setCurrentUser(defaultUser);
        localStorage.setItem('gnk_b2b_current_user_id', defaultUser.id);
      }
    };

    updateUsers();
    return b2bStore.subscribe(updateUsers);
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      // 1. Try real NestJS Auth API first
      const res = await authApi.login({ email, password: password || 'partner123' });
      if (res && res.accessToken) {
        apiClient.setToken(res.accessToken);
        setCurrentUser(res.user);
        localStorage.setItem('gnk_b2b_current_user_id', res.user.id);
        return true;
      }
    } catch {
      // Offline fallback: Use local mock user store
    }

    const users = b2bStore.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('gnk_b2b_current_user_id', user.id);
      return true;
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
    } catch {
      // Offline fallback: Register in local store
    }

    const newUser = b2bStore.registerAgent(data);
    setCurrentUser(newUser);
    localStorage.setItem('gnk_b2b_current_user_id', newUser.id);
    return newUser;
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
  const isApprovedAgent = currentUser?.approvalStatus === 'APPROVED';
  const isPendingAgent = currentUser?.approvalStatus === 'PENDING_VERIFICATION' || currentUser?.approvalStatus === 'ADMIN_REVIEW';

  return (
    <B2BAuthContext.Provider
      value={{
        currentUser,
        currentAgency,
        isAdmin,
        isApprovedAgent,
        isPendingAgent,
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

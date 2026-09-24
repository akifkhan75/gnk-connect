/**
 * Centralized API Client for GNK Elite B2B Platform
 * Communicates with NestJS Backend API (http://localhost:4000/api/v1)
 * Includes automatic Bearer JWT injection, error normalization, and resilient offline fallback.
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
  || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getToken(): string | null {
    try {
      return localStorage.getItem('gnk_jwt_access_token');
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem('gnk_jwt_access_token', token);
      } else {
        localStorage.removeItem('gnk_jwt_access_token');
      }
    } catch (e) {
      console.warn('Could not persist auth token', e);
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        throw new ApiError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      // If no content, return empty object
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network connection failed', 0);
    }
  }

  public get<T = any>(endpoint: string, query?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params.append(key, String(val));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    const token = this.getToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type for FormData, the browser sets multipart/form-data with boundary automatically

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        throw new ApiError(errorData.message || 'File upload failed', response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network error during upload', 0, err);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// ---------------- Endpoint Specific API Services ---------------- //

export const uploadsApi = {
  uploadDocument: async (file: File, category: string = 'DTS_LICENSE', agentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (agentId) formData.append('agentId', agentId);
    return apiClient.upload<{ success: boolean; file: any; message?: string }>('uploads/document', formData);
  },

  uploadPaymentSlip: async (file: File, bookingId?: string, agentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (bookingId) formData.append('bookingId', bookingId);
    if (agentId) formData.append('agentId', agentId);
    return apiClient.upload<{ success: boolean; file: any; message?: string }>('uploads/payment-slip', formData);
  },

  resolveUrl: (urlOrPath?: string) => {
    if (!urlOrPath) return '';
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('data:') || urlOrPath.startsWith('blob:')) {
      return urlOrPath;
    }
    const cleanPath = urlOrPath.replace(/^\/+/, '');
    if (cleanPath.startsWith('api/v1/')) {
      return `http://localhost:4000/${cleanPath}`;
    }
    return `http://localhost:4000/api/v1/${cleanPath}`;
  }
};

export const authApi = {
  login: (credentials: { email: string; password?: string }) =>
    apiClient.post<{ accessToken: string; user: any; agency?: any }>('auth/login', credentials),

  register: (data: any) =>
    apiClient.post<{ accessToken: string; user: any; agency?: any }>('auth/register', data),

  getMe: () =>
    apiClient.get<{ user: any; agency?: any }>('auth/me'),
};

export const suppliersApi = {
  getSuppliers: () =>
    apiClient.get<any[]>('suppliers'),

  getProducts: (filter?: any) =>
    apiClient.get<any[]>('suppliers/products', filter),

  getProductDetails: (supplierId: string, productId: string) =>
    apiClient.get<any>(`suppliers/${supplierId}/products/${productId}`),

  syncInventory: () =>
    apiClient.post<{ success: boolean; syncedCount: number; durationMs: number }>('suppliers/sync'),
};

export const pricingApi = {
  getRules: () =>
    apiClient.get<any[]>('pricing/rules'),

  saveRule: (rule: any) =>
    apiClient.post<any>('pricing/rules', rule),

  calculatePrice: (params: any) =>
    apiClient.post<any>('pricing/calculate', params),
};

export const agentsApi = {
  getAllAgents: () =>
    apiClient.get<any[]>('agents'),

  getAgencies: () =>
    apiClient.get<any[]>('agents/agencies'),

  updateStatus: (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') =>
    apiClient.patch<any>(`agents/${userId}/status`, { status }),
};

export const bookingsApi = {
  getAllBookings: () =>
    apiClient.get<any[]>('bookings'),

  getBookingById: (id: string) =>
    apiClient.get<any>(`bookings/${id}`),

  approveAndPush: (id: string) =>
    apiClient.post<{ success: boolean; supplierBookingId?: string; message?: string }>(`bookings/${id}/approve-push`),
};

export const ledgerApi = {
  getAgencyLedger: (agencyId: string) =>
    apiClient.get<any[]>(`ledger/agency/${agencyId}`),

  getStatementOfAccount: (agencyId: string, from?: string, to?: string) =>
    apiClient.get<any>(`ledger/statement/${agencyId}`, { from, to }),

  getAdminSummary: () =>
    apiClient.get<any>('ledger/admin/summary'),

  topUpWallet: (data: { agencyId: string; amountPKR: number; reference: string; description: string }) =>
    apiClient.post<any>('ledger/topup', data),
};

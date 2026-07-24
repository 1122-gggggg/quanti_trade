export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface PlatformWorkspace {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
}

export interface PlatformSession {
  token: string;
  expiresAt: string;
  sessionId: string;
}

export interface PlatformHealth {
  status: 'ok' | 'degraded';
  service: string;
  checks: Record<string, string>;
  requestId: string;
}

export interface PlatformInstrument {
  id: string;
  canonical_symbol: string;
  provider: string;
  provider_symbol: string;
  asset_class: string;
  venue: string;
  name: string;
  currency: string;
  timezone: string;
  metadata: Record<string, unknown>;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

const TOKEN_KEY = 'apex_platform_token';

export class PlatformApi {
  private readonly baseUrl: string;

  constructor(baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  set token(value: string | null) {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json() as T & ApiErrorPayload;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Platform API failed with status ${response.status}`);
    }
    return payload;
  }

  health(): Promise<PlatformHealth> {
    return this.request('/health');
  }

  async register(email: string, password: string, displayName: string): Promise<{
    user: PlatformUser;
    workspace: PlatformWorkspace;
    session: PlatformSession;
  }> {
    const result = await this.request<{
      user: PlatformUser;
      workspace: PlatformWorkspace;
      session: PlatformSession;
    }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    this.token = result.session.token;
    return result;
  }

  async login(email: string, password: string): Promise<{ user: PlatformUser; session: PlatformSession }> {
    const result = await this.request<{ user: PlatformUser; session: PlatformSession }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.session.token;
    return result;
  }

  async logout(): Promise<void> {
    try {
      if (this.token) await this.request('/v1/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      this.token = null;
    }
  }

  me(): Promise<{ user: PlatformUser; workspaces: PlatformWorkspace[] }> {
    return this.request('/v1/me');
  }

  instruments(query = ''): Promise<{ data: PlatformInstrument[] }> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    return this.request(`/v1/instruments?${params.toString()}`);
  }

  bars(params: {
    instrumentId?: string;
    datasetId?: string;
    workspaceId?: string;
    interval?: string;
    adjustmentMode?: 'raw' | 'split' | 'total_return';
    from?: number;
    to?: number;
  }): Promise<{ data: Array<Record<string, number | null>>; meta: Record<string, unknown> }> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    return this.request(`/v1/bars?${search.toString()}`);
  }

  createBacktest(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request('/v1/backtests', { method: 'POST', body: JSON.stringify(input) });
  }

  saveLayout(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request('/v1/layouts', { method: 'POST', body: JSON.stringify(input) });
  }
}

export const platformApi = new PlatformApi();

type ApiError = { message: string };

type AuthUser = {
  id: string;
  email?: string;
};

type Session = {
  access_token: string;
  user: AuthUser;
};

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT';
type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

const TOKEN_KEY = 'am_token';
const USER_KEY = 'am_user';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

function apiUrl(p: string) {
  if (API_BASE_URL) return `${String(API_BASE_URL).replace(/\/+$/, '')}${p}`;
  return p;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getStoredUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user: any | null) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function apiFetchJson(path: string, init?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...init, headers: { ...headers, ...(init?.headers as any) } });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || res.statusText || 'Request failed';
    return { data: null, error: { message: msg } as ApiError };
  }
  if (json && typeof json === 'object' && 'error' in json && 'data' in json) return json;
  return { data: json, error: null };
}

const authSubscribers = new Set<AuthChangeCallback>();

function currentSession(): Session | null {
  const token = getToken();
  if (!token) return null;
  const user = getStoredUser();
  const id = user?.id || 'unknown';
  return { access_token: token, user: { id, email: user?.email } };
}

class QueryBuilder implements PromiseLike<any> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionValues: any = null;
  private filters: Array<{ op: string; column: string; value: any }> = [];
  private orGroups: Array<Array<{ op: string; column: string; value: any }>> = [];
  private orderBy: { column: string; ascending?: boolean } | null = null;
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private wantSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: any) {
    if (this.action === 'select') this.action = 'select';
    return this;
  }

  insert(values: any) {
    this.action = 'insert';
    this.actionValues = values;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.actionValues = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ op: 'in', column, value });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ op: 'ilike', column, value: pattern });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ op: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ op: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ op: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ op: 'lte', column, value });
    return this;
  }

  or(expr: string) {
    const parts = String(expr)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const groups: Array<Array<{ op: string; column: string; value: any }>> = [];
    for (const p of parts) {
      const m = p.match(/^([a-zA-Z0-9_]+)\.(ilike|like|eq)\.(.+)$/);
      if (!m) continue;
      const column = m[1];
      const op = m[2];
      const value = m[3];
      groups.push([{ op, column, value }]);
    }
    if (groups.length) this.orGroups.push(...groups);
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: opts?.ascending };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  async execute() {
    if (this.action === 'select') {
      return await apiFetchJson(`/api/rest/${this.table}/select`, {
        method: 'POST',
        body: JSON.stringify({
          filters: this.filters,
          or: this.orGroups,
          order: this.orderBy,
          limit: this.limitCount ?? undefined,
          offset: this.offsetCount ?? undefined,
          single: this.wantSingle
        })
      });
    }
    if (this.action === 'insert') {
      const r = await apiFetchJson(`/api/rest/${this.table}/insert`, { method: 'POST', body: JSON.stringify({ values: this.actionValues }) });
      if (!r?.error && this.wantSingle && Array.isArray(r?.data)) return { data: r.data[0] || null, error: null };
      return r;
    }
    if (this.action === 'update') {
      return await apiFetchJson(`/api/rest/${this.table}/update`, {
        method: 'POST',
        body: JSON.stringify({ values: this.actionValues, filters: this.filters })
      });
    }
    if (this.action === 'delete') {
      return await apiFetchJson(`/api/rest/${this.table}/delete`, { method: 'POST', body: JSON.stringify({ filters: this.filters }) });
    }
    return { data: null, error: { message: 'Unsupported operation' } as ApiError };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const r = await apiFetchJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (r.error) return { error: r.error };
      const token = r.data?.token;
      const user = r.data?.user;
      setToken(token);
      setStoredUser(user);
      const session: Session | null = token ? { access_token: token, user: { id: user?.id, email: user?.email } } : null;
      for (const cb of authSubscribers) cb('SIGNED_IN', session);
      return { error: null };
    },
    async signInWithOtp({ email }: { email: string }) {
      return { error: { message: `OTP not supported: ${email}` } as ApiError };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      const r = await apiFetchJson('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (r.error) return { error: r.error };
      const token = r.data?.token;
      const user = r.data?.user;
      setToken(token);
      setStoredUser(user);
      const session: Session | null = token ? { access_token: token, user: { id: user?.id, email: user?.email } } : null;
      for (const cb of authSubscribers) cb('SIGNED_IN', session);
      return { error: null };
    },
    async signOut() {
      await apiFetchJson('/api/auth/logout', { method: 'POST', body: '{}' });
      setToken('');
      setStoredUser(null);
      for (const cb of authSubscribers) cb('SIGNED_OUT', null);
    },
    async getSession() {
      const session = currentSession();
      return { data: { session }, error: null };
    },
    onAuthStateChange(callback: AuthChangeCallback) {
      authSubscribers.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authSubscribers.delete(callback);
            }
          }
        }
      };
    }
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(p: string, file: File) {
          const form = new FormData();
          form.append('path', p);
          form.append('file', file);
          const token = getToken();
          const res = await fetch(apiUrl(`/api/storage/${bucket}/upload`), {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: form
          });
          if (!res.ok) {
            const text = await res.text();
            let json: any = null;
            try {
              json = text ? JSON.parse(text) : null;
            } catch {
              json = null;
            }
            const msg = json?.error?.message || res.statusText || 'Upload failed';
            return { data: null, error: { message: msg } as ApiError };
          }
          return { data: { path: p }, error: null };
        },
        getPublicUrl(p: string) {
          const base = API_BASE_URL ? String(API_BASE_URL).replace(/\/+$/, '') : '';
          const publicUrl = `${base}/storage/${bucket}/${encodeURIComponent(p).replace(/%2F/g, '/')}`;
          return { data: { publicUrl } };
        }
      };
    }
  }
};

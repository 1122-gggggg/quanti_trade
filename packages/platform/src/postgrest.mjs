export class PostgrestClient {
  constructor({ baseUrl, schema = 'app', timeoutMs = 15000 }) {
    if (!baseUrl) throw new Error('PostgREST base URL is required');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.schema = schema;
    this.timeoutMs = timeoutMs;
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
    const headers = {
      Accept: 'application/json',
      'Accept-Profile': this.schema,
      'Content-Profile': this.schema,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    };
    try {
      const response = await fetch(`${this.baseUrl}/${path.replace(/^\//, '')}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;
      if (!response.ok) {
        const error = new Error(payload?.message ?? payload?.hint ?? `PostgREST request failed: ${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  query(table, { select = '*', filters = {}, order, limit, offset, extra = {} } = {}) {
    const params = new URLSearchParams({ select });
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;
      params.set(key, typeof value === 'string' && /^(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\./.test(value)
        ? value
        : `eq.${value}`);
    }
    if (order) params.set('order', order);
    if (limit != null) params.set('limit', String(limit));
    if (offset != null) params.set('offset', String(offset));
    for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
    return this.request(`${table}?${params.toString()}`);
  }

  insert(table, rows, { upsert = false, onConflict } = {}) {
    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    return this.request(`${table}${query}`, {
      method: 'POST',
      headers: {
        Prefer: `${upsert ? 'resolution=merge-duplicates,' : ''}return=representation`,
      },
      body: rows,
    });
  }

  update(table, filters, patch) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      params.set(key, typeof value === 'string' && /^(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\./.test(value)
        ? value
        : `eq.${value}`);
    }
    return this.request(`${table}?${params.toString()}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: patch,
    });
  }

  delete(table, filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) params.set(key, `eq.${value}`);
    return this.request(`${table}?${params.toString()}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
  }

  rpc(name, body = {}) {
    return this.request(`rpc/${name}`, { method: 'POST', body });
  }

  async insertChunks(table, rows, chunkSize = 500) {
    const output = [];
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const inserted = await this.insert(table, chunk);
      if (Array.isArray(inserted)) output.push(...inserted);
    }
    return output;
  }
}

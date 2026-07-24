import net from 'node:net';

export function encodeRespCommand(args) {
  const values = args.map((value) => Buffer.from(String(value)));
  const parts = [Buffer.from(`*${values.length}\r\n`)];
  for (const value of values) {
    parts.push(Buffer.from(`$${value.length}\r\n`), value, Buffer.from('\r\n'));
  }
  return Buffer.concat(parts);
}

function parseResp(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset);
  if (lineEnd < 0) return null;
  const line = buffer.subarray(offset + 1, lineEnd).toString();
  if (prefix === '+' || prefix === '-' || prefix === ':') {
    return {
      value: prefix === ':' ? Number(line) : line,
      error: prefix === '-',
      bytes: lineEnd + 2 - offset,
    };
  }
  if (prefix === '$') {
    const length = Number(line);
    if (length === -1) return { value: null, bytes: lineEnd + 2 - offset };
    const start = lineEnd + 2;
    const end = start + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.subarray(start, end).toString(), bytes: end + 2 - offset };
  }
  if (prefix === '*') {
    const length = Number(line);
    if (length === -1) return { value: null, bytes: lineEnd + 2 - offset };
    const values = [];
    let cursor = lineEnd + 2;
    for (let index = 0; index < length; index += 1) {
      const parsed = parseResp(buffer, cursor);
      if (!parsed) return null;
      if (parsed.error) throw new Error(parsed.value);
      values.push(parsed.value);
      cursor += parsed.bytes;
    }
    return { value: values, bytes: cursor - offset };
  }
  throw new Error(`Unsupported RESP prefix: ${prefix}`);
}

export class RedisClient {
  constructor({ host = '127.0.0.1', port = 6379, password = '', database = 0, connectTimeoutMs = 5000 } = {}) {
    this.host = host;
    this.port = Number(port);
    this.password = password;
    this.database = Number(database);
    this.connectTimeoutMs = connectTimeoutMs;
  }

  async command(...args) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      const buffers = [];
      let complete = false;
      const timeout = setTimeout(() => socket.destroy(new Error('Redis connection timeout')), this.connectTimeoutMs);
      const cleanup = () => clearTimeout(timeout);
      socket.on('error', (error) => {
        cleanup();
        if (!complete) reject(error);
      });
      socket.on('connect', () => {
        const commands = [];
        if (this.password) commands.push(['AUTH', this.password]);
        if (this.database) commands.push(['SELECT', this.database]);
        commands.push(args);
        socket.write(Buffer.concat(commands.map(encodeRespCommand)));
      });
      socket.on('data', (chunk) => {
        buffers.push(chunk);
        const merged = Buffer.concat(buffers);
        let cursor = 0;
        const expectedResponses = 1 + (this.password ? 1 : 0) + (this.database ? 1 : 0) - 1;
        const responses = [];
        try {
          while (cursor < merged.length) {
            const parsed = parseResp(merged, cursor);
            if (!parsed) return;
            if (parsed.error) throw new Error(parsed.value);
            responses.push(parsed.value);
            cursor += parsed.bytes;
          }
          const minimum = 1 + (this.password ? 1 : 0) + (this.database ? 1 : 0);
          if (responses.length >= minimum) {
            complete = true;
            cleanup();
            socket.end();
            resolve(responses.at(-1));
          }
        } catch (error) {
          complete = true;
          cleanup();
          socket.destroy();
          reject(error);
        }
      });
    });
  }

  async push(queue, payload) {
    return this.command('LPUSH', queue, typeof payload === 'string' ? payload : JSON.stringify(payload));
  }

  async blockingPop(queue, timeoutSeconds = 5) {
    const value = await this.command('BRPOP', queue, timeoutSeconds);
    return Array.isArray(value) ? value[1] : null;
  }

  async ping() {
    return this.command('PING');
  }
}

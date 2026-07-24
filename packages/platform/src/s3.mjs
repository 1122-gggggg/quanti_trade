import { createHash, createHmac } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const hmac = (key, value, encoding) => createHmac('sha256', key).update(value).digest(encoding);

function encodePath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export class S3Client {
  constructor({ endpoint, accessKey, secretKey, bucket, region = 'us-east-1' }) {
    if (!endpoint || !accessKey || !secretKey || !bucket) throw new Error('Object-storage configuration is incomplete');
    this.endpoint = endpoint.replace(/\/$/, '');
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.bucket = bucket;
    this.region = region;
  }

  async request(method, key, { body = Buffer.alloc(0), contentType = 'application/octet-stream' } = {}) {
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const url = new URL(`${this.endpoint}/${encodeURIComponent(this.bucket)}/${encodePath(key)}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = hash(payload);
    const canonicalUri = url.pathname;
    const canonicalQuery = '';
    const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hash(canonicalRequest)].join('\n');
    const dateKey = hmac(Buffer.from(`AWS4${this.secretKey}`), dateStamp);
    const regionKey = hmac(dateKey, this.region);
    const serviceKey = hmac(regionKey, 's3');
    const signingKey = hmac(serviceKey, 'aws4_request');
    const signature = hmac(signingKey, stringToSign, 'hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: ['GET', 'HEAD'].includes(method) ? undefined : payload,
    });
    if (!response.ok) {
      throw new Error(`Object storage ${method} failed (${response.status}): ${await response.text()}`);
    }
    return response;
  }

  async putObject(key, body, contentType) {
    await this.request('PUT', key, { body, contentType });
    return { bucket: this.bucket, key };
  }

  async getObject(key) {
    const response = await this.request('GET', key);
    return Buffer.from(await response.arrayBuffer());
  }
}

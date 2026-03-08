import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

export interface TokenData {
  token: string;
  deviceId: string;
  androidId: string;
  spoffer: string;
  uuid: string;
  timestamp: number;
  expiry: number;
}

export interface DeviceInfo {
  model: string;
  brand: string;
  osVersion: string;
  userAgent: string;
}

const DEVICES: DeviceInfo[] = [
  { model: "Pixel 7", brand: "Google", osVersion: "13", userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
  { model: "Pixel 8", brand: "Google", osVersion: "14", userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
  { model: "SM-G998B", brand: "Samsung", osVersion: "12", userAgent: "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
  { model: "2211133G", brand: "Xiaomi", osVersion: "13", userAgent: "Mozilla/5.0 (Linux; Android 13; 2211133G) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
  { model: "OnePlus 11", brand: "OnePlus", osVersion: "13", userAgent: "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
  { model: "Redmi Note 12", brand: "Xiaomi", osVersion: "12", userAgent: "Mozilla/5.0 (Linux; Android 12; Redmi Note 12) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" },
];

class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  set(key: string, value: any, ttlSeconds: number) {
    this.cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
  }
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) return null;
    return item.value as T;
  }
  del(key: string) { this.cache.delete(key); }
}

export class RequestService {
  private baseUrl = 'https://sapi.dramaboxdb.com';
  private cache = new MemoryCache();
  private timeout = 30000;

  private getPrivateKey(): crypto.KeyObject {
    const b64 = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28XhPuC8m15u+dectsrJl+ALGcTDX3Lv3FURuwV/dN7WMEkgcseIKVMdJxzUB0PeSqCNftfxmdBV/U4yXFRxPhnSFSXCrkj6uJjickiYq1pQ1aZfrQe1eLD3MB2hKq7crhMcA3kpggQlnmy1wRR4BAttmSU4fPb/yF8D3hAgMBAAECggEBAJdru6p5RLZ3h/GLF2rud8bqv4piF51e/RWQyPFnMAGBrkByiYT7bFI3cnvJMhYpLHRigqjWfUofV3thRDDym54lVLtTRZ91khRMxgwVwdRuk8Fw7JNFenOwCJxbgdlq6iuAMuQclwll7qWUrm8DgMvzH93xf8o6X171cp4Sh0og1Ra7E9GZ37dzBlX2aJBK8VBfctZntuDPx52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPdW25ndluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";
    return crypto.createPrivateKey({ key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`, format: 'pem' });
  }

  private sign(str: string): string {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(str);
    return signer.sign(this.getPrivateKey(), 'base64');
  }

  private getRandomDevice(): DeviceInfo {
    return DEVICES[Math.floor(Math.random() * DEVICES.length)];
  }

  private getBaseHeaders(lang: string, deviceId: string, androidId: string, timestamp: string, signature: string, spoffer: string): any {
    const device = this.getRandomDevice();
    const isIndo = lang === 'in';
    const tz = isIndo ? "+420" : "-300";
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${tz}`;

    return {
      "Accept-Encoding": "gzip",
      "Connection": "Keep-Alive",
      "Content-Type": "application/json; charset=UTF-8",
      "version": "542",
      "vn": "5.4.2",
      "package-name": "com.storymatrix.drama",
      "p": "58",
      "cid": isIndo ? "DBOXINASEO1050001" : "DBOXENASEO1050001",
      "apn": "2",
      "language": lang,
      "current-language": lang,
      "device-id": deviceId,
      "android-id": androidId,
      "X-Forwarded-For": spoffer,
      "X-Real-IP": spoffer,
      "over-flow": "new-fly",
      "sn": signature,
      "pline": "ANDROID",
      "country-code": isIndo ? "ID" : "US",
      "Accept-Language": isIndo ? "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7" : "en-US,en;q=0.9",
      "mchid": "DLLPF1117102",
      "mbid": "42000004952",
      "tz": tz,
      "mcc": isIndo ? "510" : "310",
      "locale": isIndo ? "id_ID" : "en_US",
      "time-zone": tz,
      "is_root": "0",
      "nchid": "DRA1000042",
      "instanceid": "8509b2bf5177e9468d4b54b2a8e3e676",
      "md": device.model,
      "mf": device.brand,
      "brand": device.brand,
      "ov": device.osVersion,
      "User-Agent": device.userAgent,
      "srn": "1080x2400",
      "local-time": localTimeStr
    };
  }

  async generateToken(lang: string = 'in'): Promise<TokenData> {
    const timestamp = Date.now().toString();
    const deviceId = crypto.randomUUID();
    const androidId = crypto.randomBytes(8).toString('hex');
    const spoffer = Array.from({length: 4}, () => Math.floor(Math.random() * 256)).join('.');

    const payload = { distinctId: androidId, scene: null };
    const body = JSON.stringify(payload);
    const signData = `timestamp=${timestamp}${body}${deviceId}${androidId}`;
    const signature = this.sign(signData);

    const headers = this.getBaseHeaders(lang, deviceId, androidId, timestamp, signature, spoffer);
    const url = `${this.baseUrl}/drama-box/ap001/bootstrap?timestamp=${timestamp}`;

    let lastErr: any;
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, i * 1000 + Math.random() * 200));
      }
      try {
        const response = await fetch(url, { method: 'POST', headers, body });
        
        let buffer = await response.arrayBuffer();
        let text: string;
        if (response.headers.get('content-encoding') === 'gzip') {
          const decompressed = await gunzip(Buffer.from(buffer));
          text = decompressed.toString();
        } else {
          text = Buffer.from(buffer).toString();
        }

        const result = JSON.parse(text) as any;
        const user = result?.data?.user;
        if (!user) throw new Error('Bootstrap failed');

        const tokenData: TokenData = {
          token: user.token,
          deviceId,
          androidId,
          spoffer,
          uuid: user.uid.toString(),
          timestamp: Date.now(),
          expiry: Date.now() + 12 * 60 * 60 * 1000
        };

        this.cache.set(`token_v2_${lang}`, tokenData, 3600 * 11);
        return tokenData;
      } catch (err: any) {
        lastErr = err;
        if (i < 2) continue;
      }
    }
    throw lastErr;
  }

  async request(endpoint: string, payload: any = {}, lang: string = 'in'): Promise<any> {
    const cached = this.cache.get<TokenData>(`token_v2_${lang}`);
    const tokenData = cached || await this.generateToken(lang);
    
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const tn = "Bearer " + tokenData.token;
    const signData = `timestamp=${timestamp}${body}${tokenData.deviceId}${tokenData.androidId}${tn}`;
    const signature = this.sign(signData);

    const headers = this.getBaseHeaders(lang, tokenData.deviceId, tokenData.androidId, timestamp, signature, tokenData.spoffer);
    headers["tn"] = tn;
    headers["userid"] = tokenData.uuid;
    
    const url = `${this.baseUrl}${endpoint}?timestamp=${timestamp}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    let lastErr: any;
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, i * 1000 + Math.random() * 200));
      }
      try {
        const response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
        clearTimeout(id);
        
        let buffer = await response.arrayBuffer();
        let text: string;

        if (response.headers.get('content-encoding') === 'gzip') {
          const decompressed = await gunzip(Buffer.from(buffer));
          text = decompressed.toString();
        } else {
          text = Buffer.from(buffer).toString();
        }

        try {
          const parsed = JSON.parse(text);
          if (response.status >= 500 && i < 2) throw new Error('Upstream 500');
          return parsed;
        } catch (e) {
          if (i < 2) continue;
          console.error(`JSON Parse Error from ${endpoint}. Status: ${response.status}. Body snippet: ${text.substring(0, 500)}`);
          throw new Error(`Invalid JSON response from upstream (Status ${response.status})`);
        }
      } catch (err: any) {
        lastErr = err;
        if (i < 2) continue;
      }
    }
    clearTimeout(id);
    throw lastErr;
  }
}

export const requestService = new RequestService();

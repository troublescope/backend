import crypto from 'crypto';

export interface TelegramValidationResult {
  isValid: boolean;
  data: Record<string, unknown>;
  hash: string;
}

export function verifyTelegramWebAppData(
  telegramInitData: string,
  botToken: string
): TelegramValidationResult {
  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get('hash');

  if (!hash) {
    throw new Error('Hash is missing from initData');
  }

  initData.delete('hash');

  const keys = Array.from(initData.keys()).sort();
  const dataCheckString = keys.map((key) => `${key}=${initData.get(key)}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const data: Record<string, unknown> = {};
  for (const [key, value] of initData.entries()) {
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }

  return {
    isValid: calculatedHash === hash,
    data,
    hash
  };
}

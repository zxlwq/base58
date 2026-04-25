
import bs58 from 'bs58';

/**
 * 将字符串编码为 Base58
 */
export const encode = (input: string): string => {
  if (!input) return '';
  const bytes = new TextEncoder().encode(input);
  return bs58.encode(bytes);
};

/**
 * 将 Base58 字符串解码回原始字符串
 */
export const decode = (input: string): string => {
  if (!input) return '';
  try {
    const bytes = bs58.decode(input);
    return new TextDecoder().decode(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : '无效的 Base58 字符串';
    throw new Error(message);
  }
};

export const isValidBase58 = (input: string): boolean => {
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(input);
};

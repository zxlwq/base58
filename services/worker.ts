import bs58 from 'bs58';
import baseX from 'base-x';
import { base32, base64, base64url } from 'rfc4648';
import * as base45 from 'base45';

type Codec = 'base58' | 'base64' | 'base64url' | 'base32' | 'base36' | 'base45' | 'base62';
type Direction = 'encode' | 'decode';
type OutputFormat = 'text' | 'hex' | 'base64' | 'base64url';

type ConvertOptions = {
  ignoreWhitespace?: boolean;
  caseNormalize?: boolean;
  strictUtf8?: boolean;
  outputFormat?: OutputFormat;
};

type RequestMessage = {
  id: number;
  type: 'convert';
  codec: Codec;
  direction: Direction;
  input: string;
  options?: ConvertOptions;
};

type ResponseMessage =
  | { id: number; ok: true; output: string }
  | { id: number; ok: false; error: string };

type Channel = `${Codec}:${Direction}`;
type RequestWithChannel = RequestMessage & { channel?: Channel };

const BASE36 = baseX('0123456789abcdefghijklmnopqrstuvwxyz');
const BASE62 = baseX('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

const encodeTextToBytes = (text: string) => new TextEncoder().encode(text);
const decodeBytesToText = (bytes: Uint8Array, strictUtf8: boolean) =>
  new TextDecoder('utf-8', { fatal: strictUtf8 }).decode(bytes);

const stripWhitespace = (s: string) => s.replace(/\s+/g, '');
const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

self.onmessage = (event: MessageEvent<RequestWithChannel>) => {
  const msg: RequestWithChannel = event.data;
  try {
    if (msg.type !== 'convert') {
      throw new Error('未知请求类型');
    }

    const channel = (msg.channel ?? `${msg.codec}:${msg.direction}`) as Channel;

    if (msg.direction === 'encode') {
      const bytes = encodeTextToBytes(msg.input);
      let output: string;

      switch (msg.codec) {
        case 'base58':
          output = bs58.encode(bytes);
          break;
        case 'base64':
          output = base64.stringify(bytes);
          break;
        case 'base64url':
          output = base64url.stringify(bytes);
          break;
        case 'base32':
          output = base32.stringify(bytes);
          break;
        case 'base36':
          output = BASE36.encode(bytes);
          break;
        case 'base62':
          output = BASE62.encode(bytes);
          break;
        case 'base45':
          output = base45.encode(bytes as any);
          break;
        default:
          throw new Error('不支持的编码类型');
      }

      self.postMessage({ id: msg.id, ok: true, output, channel });
      return;
    }

    // decode
    let decodedBytes: Uint8Array;
    const options = msg.options ?? {};
    const ignoreWhitespace = options.ignoreWhitespace ?? true;
    const caseNormalize = options.caseNormalize ?? true;
    const strictUtf8 = options.strictUtf8 ?? false;
    const outputFormat: OutputFormat = options.outputFormat ?? 'text';

    let input = msg.input;
    if (ignoreWhitespace) input = stripWhitespace(input);

    if (caseNormalize) {
      if (msg.codec === 'base32' || msg.codec === 'base45') input = input.toUpperCase();
      if (msg.codec === 'base36') input = input.toLowerCase();
    }

    switch (msg.codec) {
      case 'base58':
        decodedBytes = bs58.decode(input);
        break;
      case 'base64':
        decodedBytes = base64.parse(input);
        break;
      case 'base64url':
        decodedBytes = base64url.parse(input);
        break;
      case 'base32':
        decodedBytes = base32.parse(input);
        break;
      case 'base36':
        decodedBytes = BASE36.decode(input);
        break;
      case 'base62':
        decodedBytes = BASE62.decode(input);
        break;
      case 'base45':
        decodedBytes = base45.decode(input as any);
        break;
      default:
        throw new Error('不支持的编码类型');
    }

    let output: string;
    if (outputFormat === 'text') {
      output = decodeBytesToText(decodedBytes, strictUtf8);
    } else if (outputFormat === 'hex') {
      output = bytesToHex(decodedBytes);
    } else if (outputFormat === 'base64') {
      output = base64.stringify(decodedBytes);
    } else if (outputFormat === 'base64url') {
      output = base64url.stringify(decodedBytes);
    } else {
      throw new Error('不支持的输出格式');
    }
    self.postMessage({ id: msg.id, ok: true, output, channel });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : '处理失败';
    self.postMessage({ id: msg.id, ok: false, error: message, channel: msg.channel });
  }
};


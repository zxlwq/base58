import bs58 from 'bs58';

type RequestMessage =
  | { id: number; type: 'encode'; input: string }
  | { id: number; type: 'decode'; input: string }
  | { id: number; type: 'b64-encode'; input: string }
  | { id: number; type: 'b64-decode'; input: string };

type ResponseMessage =
  | { id: number; ok: true; output: string }
  | { id: number; ok: false; error: string };

const respond = (message: ResponseMessage) => {
  self.postMessage(message);
};

type Channel = 'encode' | 'decode' | 'b64-encode' | 'b64-decode';
type RequestWithChannel = RequestMessage & { channel?: Channel };

const uint8ToBase64 = (bytes: Uint8Array): string => {
  // Avoid stack overflow on huge inputs by chunking.
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const base64ToUint8 = (base64: string): Uint8Array => {
  const normalized = base64.replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

self.onmessage = (event: MessageEvent<RequestWithChannel>) => {
  const msg: RequestWithChannel = event.data;
  try {
    if (msg.type === 'encode') {
      const bytes = new TextEncoder().encode(msg.input);
      const output = bs58.encode(bytes);
      self.postMessage({ id: msg.id, ok: true, output, channel: (msg.channel ?? 'encode') satisfies Channel });
      return;
    }

    if (msg.type === 'decode') {
      const bytes = bs58.decode(msg.input);
      const output = new TextDecoder().decode(bytes);
      self.postMessage({ id: msg.id, ok: true, output, channel: (msg.channel ?? 'decode') satisfies Channel });
      return;
    }

    if (msg.type === 'b64-encode') {
      const bytes = new TextEncoder().encode(msg.input);
      const output = uint8ToBase64(bytes);
      self.postMessage({ id: msg.id, ok: true, output, channel: (msg.channel ?? 'b64-encode') satisfies Channel });
      return;
    }

    if (msg.type === 'b64-decode') {
      const bytes = base64ToUint8(msg.input);
      const output = new TextDecoder().decode(bytes);
      self.postMessage({ id: msg.id, ok: true, output, channel: (msg.channel ?? 'b64-decode') satisfies Channel });
      return;
    }

    throw new Error('未知请求类型');
  } catch (error) {
    const message = error instanceof Error ? error.message : '处理失败';
    self.postMessage({ id: msg.id, ok: false, error: message, channel: msg.channel });
  }
};


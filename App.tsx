
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CopyIcon, CheckIcon, ClearIcon, GithubIcon } from './components/Icons';

const OUTPUT_PREVIEW_LIMIT = 20000;

const App: React.FC = () => {
  const [encodeInput, setEncodeInput] = useState('');
  const [encodeOutput, setEncodeOutput] = useState('');
  
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeOutput, setDecodeOutput] = useState('');
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [b64EncodeInput, setB64EncodeInput] = useState('');
  const [b64EncodeOutput, setB64EncodeOutput] = useState('');
  const [b64DecodeInput, setB64DecodeInput] = useState('');
  const [b64DecodeOutput, setB64DecodeOutput] = useState('');
  const [b64DecodeError, setB64DecodeError] = useState<string | null>(null);

  const [copiedSection, setCopiedSection] = useState<'encode' | 'decode' | 'b64-encode' | 'b64-decode' | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const [encodeBusy, setEncodeBusy] = useState(false);
  const [decodeBusy, setDecodeBusy] = useState(false);
  const [b64EncodeBusy, setB64EncodeBusy] = useState(false);
  const [b64DecodeBusy, setB64DecodeBusy] = useState(false);
  const [showFullEncode, setShowFullEncode] = useState(false);
  const [showFullDecode, setShowFullDecode] = useState(false);
  const [showFullB64Encode, setShowFullB64Encode] = useState(false);
  const [showFullB64Decode, setShowFullB64Decode] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('./services/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<any>) => {
      const msg = event.data as { id: number; ok: boolean; output?: string; error?: string; channel?: 'encode' | 'decode' | 'b64-encode' | 'b64-decode' };
      if (!msg || typeof msg.id !== 'number') return;
      // channel is attached by main thread when sending; if missing, ignore
      if (msg.channel === 'encode') {
        setEncodeBusy(false);
        if (msg.ok) setEncodeOutput(msg.output ?? '');
        else setEncodeOutput(msg.error ? `编码失败：${msg.error}` : '编码失败');
      } else if (msg.channel === 'decode') {
        setDecodeBusy(false);
        if (msg.ok) {
          setDecodeOutput(msg.output ?? '');
          setDecodeError(null);
        } else {
          setDecodeOutput('');
          setDecodeError(msg.error ?? '无效的 Base58 字符串');
        }
      } else if (msg.channel === 'b64-encode') {
        setB64EncodeBusy(false);
        if (msg.ok) setB64EncodeOutput(msg.output ?? '');
        else setB64EncodeOutput(msg.error ? `编码失败：${msg.error}` : '编码失败');
      } else if (msg.channel === 'b64-decode') {
        setB64DecodeBusy(false);
        if (msg.ok) {
          setB64DecodeOutput(msg.output ?? '');
          setB64DecodeError(null);
        } else {
          setB64DecodeOutput('');
          setB64DecodeError(msg.error ?? '无效的 Base64 字符串');
        }
      }
    };

    worker.onerror = () => {
      setEncodeBusy(false);
      setDecodeBusy(false);
      setB64EncodeBusy(false);
      setB64DecodeBusy(false);
      setDecodeError('Worker 运行出错');
      setEncodeOutput('编码出错...');
      setB64DecodeError('Worker 运行出错');
      setB64EncodeOutput('编码出错...');
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const runEncode = () => {
    setShowFullEncode(false);
    if (!encodeInput) {
      setEncodeOutput('');
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setEncodeOutput('编码出错：Worker 未就绪');
      return;
    }
    setEncodeBusy(true);
    const id = ++reqIdRef.current;
    worker.postMessage({ id, type: 'encode', input: encodeInput, channel: 'encode' });
  };

  const runDecode = () => {
    setShowFullDecode(false);
    if (!decodeInput) {
      setDecodeOutput('');
      setDecodeError(null);
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setDecodeOutput('');
      setDecodeError('解码失败：Worker 未就绪');
      return;
    }
    setDecodeBusy(true);
    const id = ++reqIdRef.current;
    worker.postMessage({ id, type: 'decode', input: decodeInput, channel: 'decode' });
  };

  const runB64Encode = () => {
    setShowFullB64Encode(false);
    if (!b64EncodeInput) {
      setB64EncodeOutput('');
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setB64EncodeOutput('编码出错：Worker 未就绪');
      return;
    }
    setB64EncodeBusy(true);
    const id = ++reqIdRef.current;
    worker.postMessage({ id, type: 'b64-encode', input: b64EncodeInput, channel: 'b64-encode' });
  };

  const runB64Decode = () => {
    setShowFullB64Decode(false);
    if (!b64DecodeInput) {
      setB64DecodeOutput('');
      setB64DecodeError(null);
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setB64DecodeOutput('');
      setB64DecodeError('解码失败：Worker 未就绪');
      return;
    }
    setB64DecodeBusy(true);
    const id = ++reqIdRef.current;
    worker.postMessage({ id, type: 'b64-decode', input: b64DecodeInput, channel: 'b64-decode' });
  };

  const encodePreview = useMemo(() => {
    if (showFullEncode) return encodeOutput;
    if (encodeOutput.length <= OUTPUT_PREVIEW_LIMIT) return encodeOutput;
    const head = encodeOutput.slice(0, OUTPUT_PREVIEW_LIMIT / 2);
    const tail = encodeOutput.slice(-OUTPUT_PREVIEW_LIMIT / 2);
    return `${head}\n...\n(已折叠，长度 ${encodeOutput.length} 字符)\n...\n${tail}`;
  }, [encodeOutput, showFullEncode]);

  const decodePreview = useMemo(() => {
    if (showFullDecode) return decodeOutput;
    if (decodeOutput.length <= OUTPUT_PREVIEW_LIMIT) return decodeOutput;
    const head = decodeOutput.slice(0, OUTPUT_PREVIEW_LIMIT / 2);
    const tail = decodeOutput.slice(-OUTPUT_PREVIEW_LIMIT / 2);
    return `${head}\n...\n(已折叠，长度 ${decodeOutput.length} 字符)\n...\n${tail}`;
  }, [decodeOutput, showFullDecode]);

  const b64EncodePreview = useMemo(() => {
    if (showFullB64Encode) return b64EncodeOutput;
    if (b64EncodeOutput.length <= OUTPUT_PREVIEW_LIMIT) return b64EncodeOutput;
    const head = b64EncodeOutput.slice(0, OUTPUT_PREVIEW_LIMIT / 2);
    const tail = b64EncodeOutput.slice(-OUTPUT_PREVIEW_LIMIT / 2);
    return `${head}\n...\n(已折叠，长度 ${b64EncodeOutput.length} 字符)\n...\n${tail}`;
  }, [b64EncodeOutput, showFullB64Encode]);

  const b64DecodePreview = useMemo(() => {
    if (showFullB64Decode) return b64DecodeOutput;
    if (b64DecodeOutput.length <= OUTPUT_PREVIEW_LIMIT) return b64DecodeOutput;
    const head = b64DecodeOutput.slice(0, OUTPUT_PREVIEW_LIMIT / 2);
    const tail = b64DecodeOutput.slice(-OUTPUT_PREVIEW_LIMIT / 2);
    return `${head}\n...\n(已折叠，长度 ${b64DecodeOutput.length} 字符)\n...\n${tail}`;
  }, [b64DecodeOutput, showFullB64Decode]);

  const copyToClipboard = async (text: string, section: 'encode' | 'decode' | 'b64-encode' | 'b64-decode') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('无法复制!', err);
    }
  };

  const clearAll = () => {
    setEncodeInput('');
    setDecodeInput('');
    setEncodeOutput('');
    setDecodeOutput('');
    setDecodeError(null);
    setEncodeBusy(false);
    setDecodeBusy(false);
    setB64EncodeInput('');
    setB64DecodeInput('');
    setB64EncodeOutput('');
    setB64DecodeOutput('');
    setB64DecodeError(null);
    setB64EncodeBusy(false);
    setB64DecodeBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/images/favicon.ico" 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.parentElement!.className = "w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl";
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerText = "58";
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Base58</h1>
              <p className="text-xs text-slate-400 font-medium">在线base58编码解码工具</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={clearAll}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="清除所有内容"
            >
              <ClearIcon />
            </button>
            <a 
              href="https://github.com/zxlwq/base" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="查看源代码"
            >
              <GithubIcon />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Encoder */}
        <section className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              编码器
            </h2>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">文本 ➔ Base58</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
              <label htmlFor="encode-input" className="text-sm text-slate-400 font-medium">输入 (纯文本)</label>
              <button
                onClick={runEncode}
                disabled={encodeBusy}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  encodeBusy
                    ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                }`}
              >
                {encodeBusy ? '编码中...' : '立即编码'}
              </button>
            </div>
            <textarea
              id="encode-input"
              name="encode-input"
              value={encodeInput}
              onChange={(e) => {
                setEncodeInput(e.target.value);
                setEncodeOutput('');
                setEncodeBusy(false);
                setShowFullEncode(false);
              }}
              placeholder="在此粘贴要编码的文本..."
              className="w-full h-48 p-4 bg-transparent outline-none resize-none mono text-sm leading-relaxed"
            />
            
            <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
              <span className="text-sm text-slate-400 font-medium">结果 (Base58)</span>
              <div className="flex items-center gap-2">
                {encodeOutput.length > OUTPUT_PREVIEW_LIMIT ? (
                  <button
                    onClick={() => setShowFullEncode(v => !v)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {showFullEncode ? '折叠' : '显示全部'}
                  </button>
                ) : null}
                <button 
                  onClick={() => copyToClipboard(encodeOutput, 'encode')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    copiedSection === 'encode' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-transparent'
                  }`}
                >
                  {copiedSection === 'encode' ? <CheckIcon /> : <CopyIcon />}
                  {copiedSection === 'encode' ? '已复制!' : '复制'}
                </button>
              </div>
            </div>
            <div className="w-full h-48 p-4 bg-slate-950/50 overflow-auto break-all mono text-sm text-blue-400 whitespace-pre-wrap">
              {encodePreview || <span className="text-slate-600 italic">编码结果将在此显示...</span>}
            </div>
          </div>
        </section>

        {/* Right: Decoder */}
        <section className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              解码器
            </h2>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Base58 ➔ 文本</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
              <label htmlFor="decode-input" className="text-sm text-slate-400 font-medium">输入 (Base58 字符串)</label>
              <button
                onClick={runDecode}
                disabled={decodeBusy}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  decodeBusy
                    ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {decodeBusy ? '解码中...' : '立即解码'}
              </button>
            </div>
            <textarea
              id="decode-input"
              name="decode-input"
              value={decodeInput}
              onChange={(e) => {
                setDecodeInput(e.target.value);
                setDecodeOutput('');
                setDecodeError(null);
                setDecodeBusy(false);
                setShowFullDecode(false);
              }}
              placeholder="在此粘贴要解码的 Base58 字符串..."
              className={`w-full h-48 p-4 bg-transparent outline-none resize-none mono text-sm leading-relaxed ${decodeError ? 'text-red-400' : ''}`}
            />
            
            <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
              <span className="text-sm text-slate-400 font-medium">结果 (纯文本)</span>
              <div className="flex gap-2">
                {decodeOutput.length > OUTPUT_PREVIEW_LIMIT && !decodeError ? (
                  <button
                    onClick={() => setShowFullDecode(v => !v)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {showFullDecode ? '折叠' : '显示全部'}
                  </button>
                ) : null}
                <button 
                  onClick={() => copyToClipboard(decodeOutput, 'decode')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    copiedSection === 'decode' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-transparent'
                  }`}
                >
                  {copiedSection === 'decode' ? <CheckIcon /> : <CopyIcon />}
                  {copiedSection === 'decode' ? '已复制!' : '复制'}
                </button>
              </div>
            </div>
            <div className="w-full h-48 p-4 bg-slate-950/50 overflow-auto break-words text-sm text-emerald-400 whitespace-pre-wrap">
              {decodeError ? (
                <div className="text-red-400 bg-red-400/5 p-2 rounded border border-red-400/20 text-xs">
                  {decodeError}
                </div>
              ) : (
                decodePreview || <span className="text-slate-600 italic">解码结果将在此显示...</span>
              )}
            </div>
          </div>
        </section>

        {/* Base64 */}
        <section className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Base64
            </h2>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">文本 ⇄ Base64</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Base64 Encoder */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <label htmlFor="b64-encode-input" className="text-sm text-slate-400 font-medium">输入 (纯文本)</label>
                <button
                  onClick={runB64Encode}
                  disabled={b64EncodeBusy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    b64EncodeBusy
                      ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {b64EncodeBusy ? '编码中...' : '立即编码'}
                </button>
              </div>
              <textarea
                id="b64-encode-input"
                name="b64-encode-input"
                value={b64EncodeInput}
                onChange={(e) => {
                  setB64EncodeInput(e.target.value);
                  setB64EncodeOutput('');
                  setB64EncodeBusy(false);
                  setShowFullB64Encode(false);
                }}
                placeholder="在此粘贴要编码的文本..."
                className="w-full h-48 p-4 bg-transparent outline-none resize-none mono text-sm leading-relaxed"
              />

              <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">结果 (Base64)</span>
                <div className="flex items-center gap-2">
                  {b64EncodeOutput.length > OUTPUT_PREVIEW_LIMIT ? (
                    <button
                      onClick={() => setShowFullB64Encode(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    >
                      {showFullB64Encode ? '折叠' : '显示全部'}
                    </button>
                  ) : null}
                  <button 
                    onClick={() => copyToClipboard(b64EncodeOutput, 'b64-encode')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      copiedSection === 'b64-encode' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-transparent'
                    }`}
                  >
                    {copiedSection === 'b64-encode' ? <CheckIcon /> : <CopyIcon />}
                    {copiedSection === 'b64-encode' ? '已复制!' : '复制'}
                  </button>
                </div>
              </div>
              <div className="w-full h-48 p-4 bg-slate-950/50 overflow-auto break-all mono text-sm text-purple-300 whitespace-pre-wrap">
                {b64EncodePreview || <span className="text-slate-600 italic">编码结果将在此显示...</span>}
              </div>
            </div>

            {/* Base64 Decoder */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <label htmlFor="b64-decode-input" className="text-sm text-slate-400 font-medium">输入 (Base64 字符串)</label>
                <button
                  onClick={runB64Decode}
                  disabled={b64DecodeBusy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    b64DecodeBusy
                      ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {b64DecodeBusy ? '解码中...' : '立即解码'}
                </button>
              </div>
              <textarea
                id="b64-decode-input"
                name="b64-decode-input"
                value={b64DecodeInput}
                onChange={(e) => {
                  setB64DecodeInput(e.target.value);
                  setB64DecodeOutput('');
                  setB64DecodeError(null);
                  setB64DecodeBusy(false);
                  setShowFullB64Decode(false);
                }}
                placeholder="在此粘贴要解码的 Base64 字符串..."
                className={`w-full h-48 p-4 bg-transparent outline-none resize-none mono text-sm leading-relaxed ${b64DecodeError ? 'text-red-400' : ''}`}
              />

              <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">结果 (纯文本)</span>
                <div className="flex gap-2">
                  {b64DecodeOutput.length > OUTPUT_PREVIEW_LIMIT && !b64DecodeError ? (
                    <button
                      onClick={() => setShowFullB64Decode(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    >
                      {showFullB64Decode ? '折叠' : '显示全部'}
                    </button>
                  ) : null}
                  <button 
                    onClick={() => copyToClipboard(b64DecodeOutput, 'b64-decode')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      copiedSection === 'b64-decode' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-transparent'
                    }`}
                  >
                    {copiedSection === 'b64-decode' ? <CheckIcon /> : <CopyIcon />}
                    {copiedSection === 'b64-decode' ? '已复制!' : '复制'}
                  </button>
                </div>
              </div>
              <div className="w-full h-48 p-4 bg-slate-950/50 overflow-auto break-words text-sm text-purple-300 whitespace-pre-wrap">
                {b64DecodeError ? (
                  <div className="text-red-400 bg-red-400/5 p-2 rounded border border-red-400/20 text-xs">
                    {b64DecodeError}
                  </div>
                ) : (
                  b64DecodePreview || <span className="text-slate-600 italic">解码结果将在此显示...</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/50 p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-4">
            <h4 className="font-bold text-white">关于 Base58</h4>
            <p className="text-slate-400 leading-relaxed">
              Base58 是一种将大整数表示为字母数字文本的二进制转文本编码方案。
              它专为人眼可读性设计，避免了 0 (零)、O (大写 O)、I (大写 I) 和 l (小写 L) 等容易混淆的字符。
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white">核心功能</h4>
            <ul className="text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                零依赖加密算法实现
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                比特币标准字母表支持
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                实时双向自动转换
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white">开发者信息</h4>
            <p className="text-slate-400">
              基于 React、TypeScript 和 Tailwind CSS 构建。支持通过 GitHub 部署到 Cloudflare Pages。
            </p>
            <div className="flex gap-4">
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                v1.0.0 稳定版
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Base58 在线工具. 开源项目.
        </div>
      </footer>
    </div>
  );
};

export default App;

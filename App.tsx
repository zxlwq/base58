
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CopyIcon, CheckIcon, ClearIcon, GithubIcon } from './components/Icons';

const OUTPUT_PREVIEW_LIMIT = 20000;

type Codec = 'base58' | 'base64' | 'base64url' | 'base32' | 'base36' | 'base45' | 'base62';
type Direction = 'encode' | 'decode';
type OutputFormat = 'text' | 'hex' | 'base64' | 'base64url';

const CODEC_OPTIONS: Array<{ value: Codec; label: string; hint: string }> = [
  { value: 'base58', label: 'Base58', hint: '文本 ⇄ Base58' },
  { value: 'base64', label: 'Base64', hint: '文本 ⇄ Base64' },
  { value: 'base64url', label: 'Base64URL', hint: '文本 ⇄ Base64URL（URL 安全）' },
  { value: 'base32', label: 'Base32', hint: '文本 ⇄ Base32' },
  { value: 'base36', label: 'Base36', hint: '文本 ⇄ Base36（0-9a-z）' },
  { value: 'base45', label: 'Base45', hint: '文本 ⇄ Base45（如 EU DCC）' },
  { value: 'base62', label: 'Base62', hint: '文本 ⇄ Base62' },
];

const App: React.FC = () => {
  const [codec, setCodec] = useState<Codec>('base58');
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decodeOutputFormat, setDecodeOutputFormat] = useState<OutputFormat>('text');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [caseNormalize, setCaseNormalize] = useState(true);
  const [strictUtf8, setStrictUtf8] = useState(false);

  const [copiedSection, setCopiedSection] = useState<'output' | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const lastReqIdRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('./services/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<any>) => {
      const msg = event.data as { id: number; ok: boolean; output?: string; error?: string; channel?: string };
      if (!msg || typeof msg.id !== 'number') return;

      if (lastReqIdRef.current !== msg.id) return;
      setBusy(false);
      if (msg.ok) {
        setOutput(msg.output ?? '');
        setError(null);
      } else {
        setOutput('');
        setError(msg.error ?? '转换失败');
      }
    };

    worker.onerror = () => {
      setBusy(false);
      setError('Worker 运行出错');
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const runConvert = () => {
    setShowFull(false);
    setCopiedSection(null);
    if (!input) {
      setOutput('');
      setError(null);
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setOutput('');
      setError('Worker 未就绪');
      return;
    }
    setBusy(true);
    const id = ++reqIdRef.current;
    lastReqIdRef.current = id;
    const channel = `${codec}:${direction}`;
    worker.postMessage({
      id,
      type: 'convert',
      codec,
      direction,
      input,
      options: {
        ignoreWhitespace,
        caseNormalize,
        strictUtf8: direction === 'decode' && decodeOutputFormat === 'text' ? strictUtf8 : false,
        outputFormat: direction === 'decode' ? decodeOutputFormat : undefined,
      },
      channel,
    });
  };

  const outputPreview = useMemo(() => {
    if (showFull) return output;
    if (output.length <= OUTPUT_PREVIEW_LIMIT) return output;
    const head = output.slice(0, OUTPUT_PREVIEW_LIMIT / 2);
    const tail = output.slice(-OUTPUT_PREVIEW_LIMIT / 2);
    return `${head}\n...\n(已折叠，长度 ${output.length} 字符)\n...\n${tail}`;
  }, [output, showFull]);

  const copyToClipboard = async (text: string, section: 'output') => {
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
    setInput('');
    setOutput('');
    setError(null);
    setBusy(false);
    setShowFull(false);
    setCopiedSection(null);
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
              <h1 className="text-xl font-bold tracking-tight">Base编解码</h1>
              <p className="text-xs text-slate-400 font-medium">在线多种Base编码/解码工具</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
        <section className="flex flex-col space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">编解码</h2>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                {CODEC_OPTIONS.find(o => o.value === codec)?.hint}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={clearAll}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white border border-slate-800"
                title="清除所有内容"
              >
                <ClearIcon />
              </button>

              <label htmlFor="codec-select" className="text-xs text-slate-500 font-bold uppercase tracking-widest">类型</label>
              <select
                id="codec-select"
                name="codec"
                value={codec}
                onChange={(e) => {
                  setCodec(e.target.value as Codec);
                  setOutput('');
                  setError(null);
                  setShowFull(false);
                  setBusy(false);
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm outline-none focus:border-slate-700"
              >
                {CODEC_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setDirection('encode');
                    setOutput('');
                    setError(null);
                    setShowFull(false);
                    setBusy(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    direction === 'encode'
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  编码
                </button>
                <button
                  onClick={() => {
                    setDirection('decode');
                    setOutput('');
                    setError(null);
                    setShowFull(false);
                    setBusy(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    direction === 'decode'
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  解码
                </button>
              </div>

              {direction === 'decode' ? (
                <>
                  <label htmlFor="output-format-select" className="text-xs text-slate-500 font-bold uppercase tracking-widest">输出</label>
                  <select
                    id="output-format-select"
                    name="output-format"
                    value={decodeOutputFormat}
                    onChange={(e) => {
                      setDecodeOutputFormat(e.target.value as OutputFormat);
                      setOutput('');
                      setError(null);
                      setShowFull(false);
                      setBusy(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm outline-none focus:border-slate-700"
                  >
                    <option value="text">文本(UTF-8)</option>
                    <option value="hex">Hex</option>
                    <option value="base64">Base64</option>
                    <option value="base64url">Base64URL</option>
                  </select>

                  <label className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={ignoreWhitespace}
                      onChange={(e) => {
                        setIgnoreWhitespace(e.target.checked);
                        setOutput('');
                        setError(null);
                      }}
                    />
                    忽略空白
                  </label>

                  <label className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={caseNormalize}
                      onChange={(e) => {
                        setCaseNormalize(e.target.checked);
                        setOutput('');
                        setError(null);
                      }}
                    />
                    自动大小写
                  </label>

                  {decodeOutputFormat === 'text' ? (
                    <label className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={strictUtf8}
                        onChange={(e) => {
                          setStrictUtf8(e.target.checked);
                          setOutput('');
                          setError(null);
                        }}
                      />
                      严格 UTF-8
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <label htmlFor="unified-input" className="text-sm text-slate-400 font-medium">
                  {direction === 'encode' ? '输入 (纯文本)' : `输入 (${CODEC_OPTIONS.find(o => o.value === codec)?.label} 字符串)`}
                </label>
                <button
                  onClick={runConvert}
                  disabled={busy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    busy
                      ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                      : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {busy ? '处理中...' : '立即转换'}
                </button>
              </div>
              <textarea
                id="unified-input"
                name="unified-input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setOutput('');
                  setError(null);
                  setShowFull(false);
                  setBusy(false);
                }}
                placeholder={direction === 'encode' ? '在此粘贴要编码的文本...' : '在此粘贴要解码的字符串...'}
                className="w-full h-64 p-4 bg-transparent outline-none resize-none mono text-sm leading-relaxed"
              />
            </div>

            {/* Output */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">
                  {direction === 'encode'
                    ? `结果 (${CODEC_OPTIONS.find(o => o.value === codec)?.label})`
                    : decodeOutputFormat === 'text'
                      ? '结果 (文本)'
                      : `结果 (${decodeOutputFormat.toUpperCase()})`}
                </span>
                <div className="flex items-center gap-2">
                  {output.length > OUTPUT_PREVIEW_LIMIT ? (
                    <button
                      onClick={() => setShowFull(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    >
                      {showFull ? '折叠' : '显示全部'}
                    </button>
                  ) : null}
                  <button
                    onClick={() => copyToClipboard(output, 'output')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      copiedSection === 'output'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-transparent'
                    }`}
                  >
                    {copiedSection === 'output' ? <CheckIcon /> : <CopyIcon />}
                    {copiedSection === 'output' ? '已复制!' : '复制'}
                  </button>
                </div>
              </div>

              <div className="w-full h-64 p-4 bg-slate-950/50 overflow-auto break-words mono text-sm whitespace-pre-wrap">
                {error ? (
                  <div className="text-red-400 bg-red-400/5 p-2 rounded border border-red-400/20 text-xs">
                    {error}
                  </div>
                ) : (
                  outputPreview || <span className="text-slate-600 italic">转换结果将在此显示...</span>
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
            <h4 className="font-bold text-white">关于 Base 编解码</h4>
            <p className="text-slate-400 leading-relaxed">
              Base 编解码是一类将二进制数据表示为可读文本的编码方案集合，常用于传输、存储或复制粘贴场景。
              不同变体在字符集、可读性、URL 兼容性与体积效率上各有取舍。
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white">核心功能</h4>
            <ul className="text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                多种编码一键切换（Base32/Base36/Base45/Base58/Base62/Base64/Base64URL）
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                编/解码双向转换与错误提示
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                Base64/Base64URL长文本编/解码处理
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
                v1.1.0
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Base编解码在线工具. 开源项目.
        </div>
      </footer>
    </div>
  );
};

export default App;

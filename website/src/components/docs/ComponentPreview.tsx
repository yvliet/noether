import React, { useState } from 'react';

// ==========================================
// 1. Button Sandbox Preview
// ==========================================
export const ButtonPreview: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [disabled, setDisabled] = useState(false);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-[13px]',
    lg: 'px-4.5 py-2 text-sm',
  };

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#888888] font-medium">Size:</span>
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`px-2 py-0.5 rounded cursor-pointer uppercase text-[11px] font-mono ${
                size === s
                  ? 'bg-[#ea580c] text-white font-semibold'
                  : 'bg-[#252525] text-[#a0a0a0] hover:text-white hover:bg-[#303030]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#a0a0a0] hover:text-white">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="accent-[#ea580c] cursor-pointer rounded"
            />
            <span>Disabled</span>
          </label>
          <span className="text-[#777777] font-mono">Clicks: {clickCount}</span>
        </div>
      </div>

      {/* Live Component Stage */}
      <div className="p-6 flex flex-wrap items-center justify-center gap-3 bg-[#141414]">
        {/* Primary */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClickCount((c) => c + 1)}
          className={`rounded-md font-medium cursor-pointer ${sizeClasses[size]} ${
            disabled
              ? 'bg-[#ea580c]/40 text-white/50 cursor-not-allowed'
              : 'bg-[#ea580c] hover:bg-[#f97316] text-white active:scale-[0.98]'
          }`}
        >
          Primary Action
        </button>

        {/* Secondary */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClickCount((c) => c + 1)}
          className={`rounded-md font-medium cursor-pointer border ${sizeClasses[size]} ${
            disabled
              ? 'bg-[#202020]/40 border-[#303030] text-[#666666] cursor-not-allowed'
              : 'bg-[#222222] hover:bg-[#2b2b2b] border-[#363636] text-[#dadada] hover:text-white'
          }`}
        >
          Secondary
        </button>

        {/* Danger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClickCount((c) => c + 1)}
          className={`rounded-md font-medium cursor-pointer border ${sizeClasses[size]} ${
            disabled
              ? 'bg-rose-950/20 border-rose-900/30 text-rose-800 cursor-not-allowed'
              : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300 hover:text-rose-100'
          }`}
        >
          Danger
        </button>

        {/* Ghost */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClickCount((c) => c + 1)}
          className={`rounded-md font-medium cursor-pointer ${sizeClasses[size]} ${
            disabled
              ? 'text-[#555555] cursor-not-allowed'
              : 'hover:bg-[#222222] text-[#999999] hover:text-[#dadada]'
          }`}
        >
          Ghost
        </button>

        {/* Link */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClickCount((c) => c + 1)}
          className={`font-medium cursor-pointer underline underline-offset-2 ${sizeClasses[size]} ${
            disabled
              ? 'text-[#555555] cursor-not-allowed no-underline'
              : 'text-[#ea580c] hover:text-[#f97316]'
          }`}
        >
          Link
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 2. TextInput Sandbox Preview
// ==========================================
export const TextInputPreview: React.FC = () => {
  const [value, setValue] = useState('My Knowledge Base');
  const [hasError, setHasError] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#a0a0a0] hover:text-white">
            <input
              type="checkbox"
              checked={hasError}
              onChange={(e) => setHasError(e.target.checked)}
              className="accent-[#ea580c] cursor-pointer rounded"
            />
            <span>Error state</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[#a0a0a0] hover:text-white">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
              className="accent-[#ea580c] cursor-pointer rounded"
            />
            <span>Shortcut badge</span>
          </label>
        </div>

        <span className="text-[#777777] font-mono text-[11px]">
          Length: {value.length} chars
        </span>
      </div>

      {/* Live Component Stage */}
      <div className="p-6 flex flex-col items-center justify-center gap-2 bg-[#141414]">
        <div className="relative w-full max-w-md">
          {/* Prefix Search Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777777] pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search notes or commands..."
            className={`w-full h-9 pl-9 pr-20 bg-[#1c1c1c] rounded-md text-[13.5px] text-[#dadada] placeholder-[#666666] outline-none border ${
              hasError
                ? 'border-rose-500/80 focus:border-rose-500'
                : 'border-[#363636] focus:border-[#ea580c]'
            }`}
          />

          {/* Suffix Controls: Clear button and shortcut badge */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {value && (
              <button
                type="button"
                onClick={() => setValue('')}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#383838] text-[#888888] hover:text-white text-[10px] cursor-pointer"
                title="Clear text"
              >
                ✕
              </button>
            )}
            {showBadge && (
              <kbd className="px-1.5 py-0.5 rounded bg-[#262626] border border-[#383838] text-[10px] font-mono text-[#888888] select-none">
                Ctrl+F
              </kbd>
            )}
          </div>
        </div>

        {hasError && (
          <span className="text-xs text-rose-400 self-start max-w-md mx-auto">
            Please enter a valid vault identifier.
          </span>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Toggle Switch Sandbox Preview
// ==========================================
export const TogglePreview: React.FC = () => {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [vimMode, setVimMode] = useState(false);
  const [mcpTools, setMcpTools] = useState(true);

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header */}
      <div className="px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs text-[#888888]">
        Interactive Toggle Switch Primitives
      </div>

      {/* Live Component Stage */}
      <div className="p-5 flex flex-col gap-3 bg-[#141414] max-w-lg mx-auto">
        {/* Toggle Item 1 */}
        <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2b2b2b]">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-[#dadada]">Disk Auto-Sync</span>
            <span className="text-xs text-[#777777]">Debounced 150ms write stream to local markdown files</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={syncEnabled}
            onClick={() => setSyncEnabled((v) => !v)}
            className={`relative w-10 h-5.5 rounded-full cursor-pointer p-0.5 border ${
              syncEnabled
                ? 'bg-[#ea580c] border-[#ea580c]'
                : 'bg-[#262626] border-[#383838]'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-sm ${
                syncEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle Item 2 */}
        <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2b2b2b]">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-[#dadada]">Vim Keybindings</span>
            <span className="text-xs text-[#777777]">Modal editing in TipTap/ProseMirror editor buffers</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vimMode}
            onClick={() => setVimMode((v) => !v)}
            className={`relative w-10 h-5.5 rounded-full cursor-pointer p-0.5 border ${
              vimMode
                ? 'bg-[#ea580c] border-[#ea580c]'
                : 'bg-[#262626] border-[#383838]'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-sm ${
                vimMode ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle Item 3 */}
        <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2b2b2b]">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-[#dadada]">Model Context Protocol (MCP)</span>
            <span className="text-xs text-[#777777]">Expose safe relational SQLite query tools to AI agents</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mcpTools}
            onClick={() => setMcpTools((v) => !v)}
            className={`relative w-10 h-5.5 rounded-full cursor-pointer p-0.5 border ${
              mcpTools
                ? 'bg-[#ea580c] border-[#ea580c]'
                : 'bg-[#262626] border-[#383838]'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-sm ${
                mcpTools ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. Select Dropdown Sandbox Preview
// ==========================================
export const SelectPreview: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState('flint-dark');

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header */}
      <div className="px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs text-[#888888] flex justify-between items-center">
        <span>Select Dropdown Primitive</span>
        <span className="font-mono text-[#ea580c]">Selected: {selectedTheme}</span>
      </div>

      {/* Live Component Stage */}
      <div className="p-6 flex flex-col items-center justify-center gap-3 bg-[#141414]">
        <div className="w-full max-w-sm">
          <label className="block text-xs font-medium text-[#999999] mb-1.5">
            Active Workspace Theme
          </label>
          <div className="relative">
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-md bg-[#1c1c1c] border border-[#363636] text-[13.5px] text-[#dadada] outline-none focus:border-[#ea580c] cursor-pointer appearance-none"
            >
              <option value="flint-dark">Flint Dark (Default Charcoal)</option>
              <option value="obsidian-nord">Nordic Frost</option>
              <option value="monokai-pro">Monokai Pro Synth</option>
              <option value="paper-light">Warm Paper Light</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#777777]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. Slider Sandbox Preview
// ==========================================
export const SliderPreview: React.FC = () => {
  const [fontSize, setFontSize] = useState(15);
  const [lineHeight, setLineHeight] = useState(1.75);

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header */}
      <div className="px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs text-[#888888]">
        Numeric Range Slider Primitive
      </div>

      {/* Live Component Stage */}
      <div className="p-6 flex flex-col gap-5 bg-[#141414] max-w-md mx-auto">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#dadada]">Editor Font Size</span>
            <span className="font-mono text-[#ea580c]">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#dadada]">Line Height Multiplier</span>
            <span className="font-mono text-[#ea580c]">{lineHeight.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.05"
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
          />
        </div>

        {/* Live Typography Preview based on sliders */}
        <div
          className="p-3 rounded-md bg-[#1c1c1c] border border-[#2c2c2c] text-[#b8b8b8]"
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          Flint is engineered for deep focus and long-term data durability.
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. SettingBuilder Full Card Sandbox
// ==========================================
export const SettingBuilderPreview: React.FC = () => {
  const [apiKey, setApiKey] = useState('sk-ant-api03-flint...');
  const [streamUpdates, setStreamUpdates] = useState(true);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = () => {
    setStatus('Settings saved successfully to .flint/settings.json');
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="my-4 rounded-xl border border-[#363636] bg-[#161616] overflow-hidden select-none">
      {/* Sandbox Header */}
      <div className="px-4 py-2.5 border-b border-[#2d2d2d] bg-[#1a1a1a]/80 text-xs flex justify-between items-center">
        <span className="text-[#888888] font-medium">SettingCard & SettingItem Composition</span>
        <span className="text-[11px] font-mono text-[#777777]">SettingBuilder API</span>
      </div>

      {/* Live Component Stage */}
      <div className="p-6 bg-[#141414]">
        <div className="max-w-xl mx-auto rounded-lg border border-[#303030] bg-[#181818] overflow-hidden shadow-lg">
          {/* Card Header */}
          <div className="px-5 py-3.5 border-b border-[#282828] bg-[#1f1f1f]/50">
            <h4 className="text-sm font-semibold text-white">AI Copilot & Model Context Protocol</h4>
            <p className="text-xs text-[#888888] mt-0.5">
              Configure local LLM endpoints and tool call execution policies.
            </p>
          </div>

          {/* Setting Items */}
          <div className="divide-y divide-[#262626]">
            {/* Setting 1: API Key */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13.5px] font-medium text-[#dadada]">API Authentication Key</span>
                <span className="text-xs text-[#777777]">Used to query LLM embeddings for vector indexing</span>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-8 px-2.5 rounded bg-[#131313] border border-[#333333] text-xs text-[#dadada] outline-none focus:border-[#ea580c] w-full sm:w-48 font-mono"
              />
            </div>

            {/* Setting 2: Streaming Toggle */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13.5px] font-medium text-[#dadada]">Stream Token Generation</span>
                <span className="text-xs text-[#777777]">Render text tokens incrementally in the active buffer</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={streamUpdates}
                onClick={() => setStreamUpdates((v) => !v)}
                className={`relative w-9 h-5 rounded-full cursor-pointer p-0.5 border ${
                  streamUpdates
                    ? 'bg-[#ea580c] border-[#ea580c]'
                    : 'bg-[#262626] border-[#383838]'
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm ${
                    streamUpdates ? 'translate-x-[16px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 3: Max Token Slider */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13.5px] font-medium text-[#dadada]">Max Context Window</span>
                <span className="text-xs text-[#777777]">Maximum response tokens allowed per tool query</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-48">
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                />
                <span className="text-xs font-mono text-[#ea580c] w-12 text-right">{maxTokens}</span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="px-5 py-3 border-t border-[#282828] bg-[#1c1c1c]/60 flex items-center justify-between">
            {status ? (
              <span className="text-xs text-emerald-400">{status}</span>
            ) : (
              <span className="text-xs text-[#666666]">Local configuration stored in Hearth metadata</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 rounded bg-[#ea580c] hover:bg-[#f97316] text-white text-xs font-medium cursor-pointer"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Preview Registry Lookup
// ==========================================
export const ComponentPreviewMap: Record<string, React.FC> = {
  button: ButtonPreview,
  textinput: TextInputPreview,
  toggle: TogglePreview,
  select: SelectPreview,
  slider: SliderPreview,
  settingbuilder: SettingBuilderPreview,
  settingcard: SettingBuilderPreview,
};

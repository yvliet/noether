import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft01Icon,
  Search01Icon,
  CheckIcon,
} from '@/components/common/Icons';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const AVAILABLE_FONTS = [
  'Agency FB',
  'ALGERIAN',
  'Alice',
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Arial Rounded MT',
  'BIZ UDGothic',
  'BIZ UDMincho',
  'BIZ UDPGothic',
  'BIZ UDPMincho',
  'Bahnschrift',
  'Baskerville Old Face',
  'Bauhaus 93',
  'Bell MT',
  'Calibri',
  'Cambria',
  'Cascadia Code',
  'Century Gothic',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Fira Code',
  'Franklin Gothic Medium',
  'Georgia',
  'Gill Sans',
  'Impact',
  'Inter',
  'JetBrains Mono',
  'Lucida Console',
  'Lucida Sans',
  'Menlo',
  'Monaco',
  'Montserrat',
  'Open Sans',
  'Palatino',
  'Roboto',
  'Segoe UI',
  'Source Code Pro',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

export interface FontPickerViewProps {
  mode: 'interface' | 'text' | 'monospace';
  onClose: () => void;
}

export const FontPickerView: React.FC<FontPickerViewProps> = React.memo(({ mode, onClose }) => {
  const interfaceFont = useSettingsStore((s) => s.interfaceFont);
  const setInterfaceFont = useSettingsStore((s) => s.setInterfaceFont);
  const textFont = useSettingsStore((s) => s.textFont);
  const setTextFont = useSettingsStore((s) => s.setTextFont);
  const monospaceFont = useSettingsStore((s) => s.monospaceFont);
  const setMonospaceFont = useSettingsStore((s) => s.setMonospaceFont);

  const [fontSearchQuery, setFontSearchQuery] = useState('');

  const filteredFonts = useMemo(() => {
    return fontSearchQuery
      ? AVAILABLE_FONTS.filter((f) => f.toLowerCase().includes(fontSearchQuery.toLowerCase()))
      : AVAILABLE_FONTS;
  }, [fontSearchQuery]);

  const handleSelectFont = useCallback((fontName: string) => {
    if (mode === 'interface') {
      setInterfaceFont(fontName);
    } else if (mode === 'text') {
      setTextFont(fontName);
    } else if (mode === 'monospace') {
      setMonospaceFont(fontName);
    }
    onClose();
  }, [mode, setInterfaceFont, setTextFont, setMonospaceFont, onClose]);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 flex flex-col gap-1.5">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white cursor-pointer -ml-1 w-fit"
        >
          <ArrowLeft01Icon size={14} />
          <span className="capitalize font-medium">{mode} font</span>
        </button>

        <p className="text-xs text-[#777]">
          {mode === 'interface' && (interfaceFont ? `Current font: ${interfaceFont}` : 'No custom font is applied right now. Add one below.')}
          {mode === 'text' && (textFont ? `Current font: ${textFont}` : 'No custom font is applied right now. Add one below.')}
          {mode === 'monospace' && (monospaceFont ? `Current font: ${monospaceFont}` : 'No custom font is applied right now. Add one below.')}
        </p>
      </div>

      <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2c2c2c)] rounded-xl overflow-hidden p-3 flex flex-col gap-2">
        <div className="relative">
          <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)]" />
          <input
            type="text"
            value={fontSearchQuery}
            onChange={(e) => setFontSearchQuery(e.target.value)}
            placeholder="Enter font name..."
            className="w-full bg-[var(--noether-bg-input,#161616)] border border-[var(--noether-border-base,#2c2c2c)] focus:border-[var(--noether-border-strong)] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-[var(--noether-border-subtle,#282828)] mt-1">
          {filteredFonts.map((font) => (
            <button
              key={font}
              onClick={() => handleSelectFont(font)}
              style={{ fontFamily: font }}
              className="text-left px-3 py-2.5 text-sm text-[var(--noether-text-secondary,#ccc)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)] rounded-md cursor-pointer flex items-center justify-between"
            >
              <span>{font}</span>
              {((mode === 'interface' && interfaceFont === font) ||
                (mode === 'text' && textFont === font) ||
                (mode === 'monospace' && monospaceFont === font)) && (
                <CheckIcon size={14} className="text-white" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { buildPlaceholderLatex } from './extensions/math-snippets';
import { isFormatActive } from './extensions/markdown-shortcuts';

interface MathKeyboardProps {
  editor: any;
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = '123' | 'symbols' | 'abc' | 'greek';

export const MathKeyboard: React.FC<MathKeyboardProps> = React.memo(({
  editor,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('123');

  const insert = useCallback((templateTex: string) => {
    if (!editor) return;
    const activeMathField = document.querySelector('math-field:focus-within') as any;
    if (activeMathField && typeof activeMathField.insert === 'function') {
      const latex = templateTex.includes('‹') ? buildPlaceholderLatex(templateTex) : templateTex;
      activeMathField.insert(latex);
      return;
    }

    const { from, to, empty } = editor.state.selection;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to);
    const latex = templateTex.includes('‹')
      ? buildPlaceholderLatex(templateTex, selectedText)
      : templateTex;

    if (isFormatActive(editor, '$')) {
      editor.chain().focus().insertContent(latex).run();
    } else {
      editor.chain().focus().insertContent(`$${latex}$`).run();
    }
  }, [editor]);

  const handleBackspace = useCallback(() => {
    const activeMathField = document.querySelector('math-field:focus-within') as any;
    if (activeMathField && typeof activeMathField.executeCommand === 'function') {
      activeMathField.executeCommand('deleteBackward');
      return;
    }
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty && from > 0) {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    } else if (!empty) {
      editor.chain().focus().deleteSelection().run();
    }
  }, [editor]);

  const handleMoveLeft = useCallback(() => {
    const activeMathField = document.querySelector('math-field:focus-within') as any;
    if (activeMathField && typeof activeMathField.executeCommand === 'function') {
      activeMathField.executeCommand('moveToPreviousChar');
      return;
    }
    if (!editor) return;
    const { from } = editor.state.selection;
    if (from > 0) {
      editor.chain().focus().setTextSelection(from - 1).run();
    }
  }, [editor]);

  const handleMoveRight = useCallback(() => {
    const activeMathField = document.querySelector('math-field:focus-within') as any;
    if (activeMathField && typeof activeMathField.executeCommand === 'function') {
      activeMathField.executeCommand('moveToNextChar');
      return;
    }
    if (!editor) return;
    const { from } = editor.state.selection;
    const max = editor.state.doc.content.size;
    if (from < max) {
      editor.chain().focus().setTextSelection(from + 1).run();
    }
  }, [editor]);

  const handleCopy = useCallback(() => {
    const activeMathField = document.querySelector('math-field:focus-within') as any;
    if (activeMathField && activeMathField.value) {
      navigator.clipboard.writeText(activeMathField.value);
      return;
    }
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const text = empty ? '' : editor.state.doc.textBetween(from, to);
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }, [editor]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#161616] border-t border-[#2a2a2a] shadow-[0_-8px_32px_rgba(0,0,0,0.55)] select-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Top Bar with Tabs and Controls */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#242424] bg-[#121212]">
        {/* Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('123')}
            className={`pb-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === '123'
                ? 'text-[#ea580c]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            123
            {activeTab === '123' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ea580c] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('symbols')}
            className={`pb-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'symbols'
                ? 'text-[#ea580c]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            ∞≠∈
            {activeTab === 'symbols' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ea580c] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abc')}
            className={`pb-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'abc'
                ? 'text-[#ea580c]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            abc
            {activeTab === 'abc' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ea580c] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('greek')}
            className={`pb-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'greek'
                ? 'text-[#ea580c]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            αβγ
            {activeTab === 'greek' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ea580c] rounded-full" />
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 text-[#888888]">
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            className="p-1 hover:text-white transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <span className="text-sm">↺</span>
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            className="p-1 hover:text-white transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <span className="text-sm">↻</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:text-white transition-colors"
            title="Copy Selection"
          >
            <Copy01Icon size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-white transition-colors ml-2"
            title="Close Math Keyboard"
          >
            <Cancel01Icon size={15} />
          </button>
        </div>
      </div>

      {/* Keypad Container */}
      <div className="p-4 max-w-5xl mx-auto">
        {/* ── TAB 1: 123 ── */}
        {activeTab === '123' && (
          <div className="flex items-center justify-center gap-8">
            {/* Left Cluster: Variables & Brackets */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => insert('x^{‹a›}')} className="flint-key">
                <i>x</i><sup><i>y</i></sup>
              </button>
              <button type="button" onClick={() => insert('n^{‹a›}')} className="flint-key">
                <i>n</i><sup><i>a</i></sup>
              </button>
              <button type="button" onClick={() => insert('<')} className="flint-key">&lt;</button>
              <button type="button" onClick={() => insert('>')} className="flint-key">&gt;</button>
              <button type="button" onClick={() => insert('\\left( ‹a› \\right)')} className="flint-key">(</button>
              <button type="button" onClick={() => insert('\\left( ‹a› \\right)')} className="flint-key">)</button>
              <button type="button" onClick={() => setActiveTab('abc')} className="flint-key text-xs font-semibold">
                ⇧ abc
              </button>
              <button type="button" onClick={() => insert('\\frac{‹a›}{‹b›}')} className="flint-key">
                <sup>□</sup>/<sub>□</sub>
              </button>
            </div>

            {/* Center Cluster: Numbers & Operations */}
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => insert('7')} className="flint-key font-medium">7</button>
              <button type="button" onClick={() => insert('8')} className="flint-key font-medium">8</button>
              <button type="button" onClick={() => insert('9')} className="flint-key font-medium">9</button>
              <button type="button" onClick={() => insert('\\div')} className="flint-key text-lg">÷</button>

              <button type="button" onClick={() => insert('4')} className="flint-key font-medium">4</button>
              <button type="button" onClick={() => insert('5')} className="flint-key font-medium">5</button>
              <button type="button" onClick={() => insert('6')} className="flint-key font-medium">6</button>
              <button type="button" onClick={() => insert('\\times')} className="flint-key text-lg">×</button>

              <button type="button" onClick={() => insert('1')} className="flint-key font-medium">1</button>
              <button type="button" onClick={() => insert('2')} className="flint-key font-medium">2</button>
              <button type="button" onClick={() => insert('3')} className="flint-key font-medium">3</button>
              <button type="button" onClick={() => insert('-')} className="flint-key text-lg">−</button>

              <button type="button" onClick={() => insert('0')} className="flint-key font-medium">0</button>
              <button type="button" onClick={() => insert('.')} className="flint-key font-medium">.</button>
              <button type="button" onClick={() => insert('=')} className="flint-key font-medium">=</button>
              <button type="button" onClick={() => insert('+')} className="flint-key text-lg">+</button>
            </div>

            {/* Right Cluster: Constants, Powers, Roots & Navigation */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => insert('e')} className="flint-key">
                <i>e</i><sup><span className="text-[9px] text-[#888]">ln</span></sup>
              </button>
              <button type="button" onClick={() => insert('i')} className="flint-key"><i>i</i></button>
              <button type="button" onClick={() => insert('\\pi')} className="flint-key">
                π<sup><span className="text-[9px] text-[#888]">sin</span></sup>
              </button>

              <button type="button" onClick={() => insert('^{2}')} className="flint-key">■<sup>2</sup></button>
              <button type="button" onClick={() => insert('^{‹a›}')} className="flint-key">■<sup>□</sup></button>
              <button type="button" onClick={() => insert('\\sqrt{‹a›}')} className="flint-key">√□</button>

              <button type="button" onClick={() => insert('\\int_{0}^{\\infty} ‹a› \\, dx')} className="flint-key text-xs">
                ∫<sub>0</sub><sup>∞</sup>□dx
              </button>
              <button type="button" onClick={() => insert('\\forall')} className="flint-key">∀</button>
              <button type="button" onClick={handleBackspace} className="flint-key bg-[#2a2a2a] hover:bg-[#383838]">
                ⌫
              </button>

              <button type="button" onClick={handleMoveLeft} className="flint-key">
                <ArrowLeft01Icon size={14} className="mx-auto" />
              </button>
              <button type="button" onClick={handleMoveRight} className="flint-key">
                <ArrowRight01Icon size={14} className="mx-auto" />
              </button>
              <button type="button" onClick={() => insert('\\\\')} className="flint-key bg-[#2a2a2a] hover:bg-[#383838]">
                ⏎
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: Symbols (∞≠∈) ── */}
        {activeTab === 'symbols' && (
          <div className="grid grid-cols-8 gap-2">
            <button type="button" onClick={() => insert('\\infty')} className="flint-key">∞</button>
            <button type="button" onClick={() => insert('\\neq')} className="flint-key">≠</button>
            <button type="button" onClick={() => insert('\\in')} className="flint-key">∈</button>
            <button type="button" onClick={() => insert('\\notin')} className="flint-key">∉</button>
            <button type="button" onClick={() => insert('\\subset')} className="flint-key">⊂</button>
            <button type="button" onClick={() => insert('\\subseteq')} className="flint-key">⊆</button>
            <button type="button" onClick={() => insert('\\cup')} className="flint-key">∪</button>
            <button type="button" onClick={() => insert('\\cap')} className="flint-key">∩</button>

            <button type="button" onClick={() => insert('\\leq')} className="flint-key">≤</button>
            <button type="button" onClick={() => insert('\\geq')} className="flint-key">≥</button>
            <button type="button" onClick={() => insert('\\approx')} className="flint-key">≈</button>
            <button type="button" onClick={() => insert('\\equiv')} className="flint-key">≡</button>
            <button type="button" onClick={() => insert('\\pm')} className="flint-key">±</button>
            <button type="button" onClick={() => insert('\\mp')} className="flint-key">∓</button>
            <button type="button" onClick={() => insert('\\cdot')} className="flint-key">·</button>
            <button type="button" onClick={() => insert('\\partial')} className="flint-key">∂</button>

            <button type="button" onClick={() => insert('\\sum_{i=1}^{n} ‹a›')} className="flint-key font-serif">∑</button>
            <button type="button" onClick={() => insert('\\prod_{i=1}^{n} ‹a›')} className="flint-key font-serif">∏</button>
            <button type="button" onClick={() => insert('\\int_{‹a›}^{‹b›}\\,dx')} className="flint-key font-serif">∫</button>
            <button type="button" onClick={() => insert('\\lim_{‹a› \\to ‹b›} ‹c›')} className="flint-key text-xs font-serif">lim</button>
            <button type="button" onClick={() => insert('\\rightarrow ‹a›')} className="flint-key">→</button>
            <button type="button" onClick={() => insert('\\leftarrow ‹a›')} className="flint-key">←</button>
            <button type="button" onClick={() => insert('\\implies ‹a›')} className="flint-key">⟹</button>
            <button type="button" onClick={() => insert('\\iff ‹a›')} className="flint-key">⟺</button>

            <button type="button" onClick={() => insert('\\left[ ‹a› \\right]')} className="flint-key">[ ]</button>
            <button type="button" onClick={() => insert('\\left\\{ ‹a› \\right\\}')} className="flint-key">&#123; &#125;</button>
            <button type="button" onClick={() => insert('\\left| ‹a› \\right|')} className="flint-key">| |</button>
            <button type="button" onClick={() => insert('\\begin{pmatrix} ‹a› & ‹b› \\\\ ‹c› & ‹d› \\end{pmatrix}')} className="flint-key text-xs">
              ( matrix )
            </button>
            <button type="button" onClick={() => insert('\\begin{cases} ‹a› \\\\ ‹b› \\end{cases}')} className="flint-key text-xs">
              &#123; cases
            </button>
            <button type="button" onClick={() => insert('\\text{‹a›}')} className="flint-key text-xs">
              text
            </button>
            <button type="button" onClick={handleBackspace} className="flint-key bg-[#2a2a2a]">⌫</button>
            <button type="button" onClick={() => insert('\\\\')} className="flint-key bg-[#2a2a2a]">⏎</button>
          </div>
        )}

        {/* ── TAB 3: Alphabet (abc) ── */}
        {activeTab === 'abc' && (
          <div className="grid grid-cols-10 gap-2">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((ch) => (
              <button key={ch} type="button" onClick={() => insert(ch)} className="flint-key">{ch}</button>
            ))}
            {['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'].map((ch) => (
              <button key={ch} type="button" onClick={() => insert(ch)} className="flint-key">{ch}</button>
            ))}
            {['u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C'].map((ch) => (
              <button key={ch} type="button" onClick={() => insert(ch)} className="flint-key">{ch}</button>
            ))}
            <button type="button" onClick={handleBackspace} className="flint-key bg-[#2a2a2a]">⌫</button>
          </div>
        )}

        {/* ── TAB 4: Greek (αβγ) ── */}
        {activeTab === 'greek' && (
          <div className="grid grid-cols-8 gap-2">
            {[
              { label: 'α', latex: '\\alpha' },
              { label: 'β', latex: '\\beta' },
              { label: 'γ', latex: '\\gamma' },
              { label: 'δ', latex: '\\delta' },
              { label: 'ε', latex: '\\epsilon' },
              { label: 'ζ', latex: '\\zeta' },
              { label: 'η', latex: '\\eta' },
              { label: 'θ', latex: '\\theta' },
              { label: 'ι', latex: '\\iota' },
              { label: 'κ', latex: '\\kappa' },
              { label: 'λ', latex: '\\lambda' },
              { label: 'μ', latex: '\\mu' },
              { label: 'ν', latex: '\\nu' },
              { label: 'ξ', latex: '\\xi' },
              { label: 'π', latex: '\\pi' },
              { label: 'ρ', latex: '\\rho' },
              { label: 'σ', latex: '\\sigma' },
              { label: 'τ', latex: '\\tau' },
              { label: 'φ', latex: '\\phi' },
              { label: 'χ', latex: '\\chi' },
              { label: 'ψ', latex: '\\psi' },
              { label: 'ω', latex: '\\omega' },
              { label: 'Δ', latex: '\\Delta' },
              { label: 'Γ', latex: '\\Gamma' },
              { label: 'Θ', latex: '\\Theta' },
              { label: 'Λ', latex: '\\Lambda' },
              { label: 'Σ', latex: '\\Sigma' },
              { label: 'Φ', latex: '\\Phi' },
              { label: 'Ψ', latex: '\\Psi' },
              { label: 'Ω', latex: '\\Omega' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => insert(item.latex)}
                className="flint-key font-serif"
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={handleBackspace} className="flint-key bg-[#2a2a2a]">⌫</button>
            <button type="button" onClick={() => insert('\\\\')} className="flint-key bg-[#2a2a2a]">⏎</button>
          </div>
        )}
      </div>
    </div>
  );
});

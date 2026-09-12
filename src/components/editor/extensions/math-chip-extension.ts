import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';
import { setupMathLive } from './mathlive-setup';
import { buildPlaceholderLatex } from './math-snippets';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useSettingsStore } from '@/store/settingsStore';

export interface MathChipOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathChip: {
      /**
       * Insert a math chip at current selection
       */
      insertMathChip: (options?: { latex?: string; display?: 'inline' | 'block'; startEditing?: boolean }) => ReturnType;
    };
  }
}

export const MathChip = Node.create<MathChipOptions>({
  name: 'mathChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
      display: {
        default: 'inline',
        parseHTML: (element) => element.getAttribute('data-display') || 'inline',
        renderHTML: (attributes) => ({
          'data-display': attributes.display,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-chip"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'math-chip' }, this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertMathChip:
        (options = {}) =>
        ({ commands, state }) => {
          const { from, to, empty } = state.selection;
          const selectedText = empty ? '' : state.doc.textBetween(from, to);
          const rawLatex = options.latex !== undefined ? options.latex : (selectedText ? selectedText : '');
          const latex = rawLatex.includes('‹') ? buildPlaceholderLatex(rawLatex, selectedText) : rawLatex;

          return commands.insertContent({
            type: 'mathChip',
            attrs: {
              latex,
              display: options.display || 'inline',
            },
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      setupMathLive();

      const dom = document.createElement('span');
      dom.className = 'wce-chip wce-math noether-math-node';
      dom.setAttribute('data-type', 'math-chip');
      dom.setAttribute('data-display', node.attrs.display || 'inline');
      dom.tabIndex = 0;

      let isEditing = false;
      let currentLatex = node.attrs.latex || '';
      let currentDisplay: 'inline' | 'block' = node.attrs.display === 'block' ? 'block' : 'inline';
      let activeMf: any = null;
      let lastCursorPos = editor.state.selection.from;

      const onSelectionUpdate = () => {
        const sel = editor.state.selection;
        if (!(sel as any).node) {
          lastCursorPos = sel.from;
        }
      };
      editor.on('selectionUpdate', onSelectionUpdate);

      function openMathContextMenu(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        useContextMenuStore.getState().openContextMenu(e, [
          {
            type: 'item',
            title: 'Copy LaTeX',
            onClick: () => {
              const latexToCopy = isEditing && activeMf ? activeMf.value : currentLatex;
              navigator.clipboard.writeText(latexToCopy);
            },
          },
          {
            type: 'item',
            title: 'Copy MathML',
            onClick: () => {
              const mathml = activeMf?.getValue?.('math-ml') || '';
              if (mathml) {
                navigator.clipboard.writeText(mathml);
              }
            },
          },
          {
            type: 'item',
            title: currentDisplay === 'block' ? 'Convert to Inline Math ($)' : 'Convert to Block Math ($$)',
            onClick: () => {
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  const nextDisplay = currentDisplay === 'block' ? 'inline' : 'block';
                  currentDisplay = nextDisplay;
                  dom.setAttribute('data-display', nextDisplay);
                  if (nextDisplay === 'block') {
                    dom.classList.add('wce-block');
                  } else {
                    dom.classList.remove('wce-block');
                  }
                  editor.commands.updateAttributes('mathChip', { display: nextDisplay });
                }
              }
            },
          },
          {
            type: 'separator',
          },
          {
            type: 'item',
            title: 'Delete Formula',
            isDanger: true,
            onClick: () => {
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.commands.deleteRange({ from: pos, to: pos + 1 });
                }
              }
            },
          },
        ]);
      }

      function renderStaticView() {
        isEditing = false;
        activeMf = null;
        dom.classList.remove('wce-editing');
        if (currentDisplay === 'block') {
          dom.classList.add('wce-block');
        } else {
          dom.classList.remove('wce-block');
        }
        dom.setAttribute('data-display', currentDisplay);
        dom.innerHTML = '';

        const renderSpan = document.createElement('span');
        renderSpan.className = 'wce-math-render';
        const latex = currentLatex.trim();
        const delim = currentDisplay === 'block' ? '$$' : '$';

        if (latex) {
          try {
            const formattedLatex = currentDisplay === 'block' || latex.startsWith('\\displaystyle')
              ? latex
              : `\\displaystyle ${latex}`;

            renderSpan.innerHTML = katex.renderToString(formattedLatex, {
              displayMode: currentDisplay === 'block',
              throwOnError: false,
            });
          } catch (e) {
            renderSpan.className = 'wce-math-render md-math-error';
            renderSpan.textContent = latex;
          }
        } else {
          renderSpan.innerHTML = `<span class="md-syntax-dimmed noether-math-delim">${delim}</span><span class="md-syntax-dimmed noether-math-delim">${delim}</span>`;
        }

        dom.appendChild(renderSpan);
      }

      function enterEditMode(opts: { selectAll?: boolean; fromArrow?: 'left' | 'right' | boolean } = {}) {
        if (isEditing && activeMf) return;
        isEditing = true;
        const mountedTime = Date.now();
        dom.classList.add('wce-editing');
        if (currentDisplay === 'block') {
          dom.classList.add('wce-block');
        } else {
          dom.classList.remove('wce-block');
        }
        dom.setAttribute('data-display', currentDisplay);
        dom.innerHTML = '';

        const delim = currentDisplay === 'block' ? '$$' : '$';

        // Left dimmed dollar
        const leftDollar = document.createElement('span');
        leftDollar.className = 'md-syntax-dimmed noether-math-delim';
        leftDollar.textContent = delim;
        dom.appendChild(leftDollar);

        const mf = document.createElement('math-field') as any;
        activeMf = mf;
        mf.className = 'noether-live-math-field';
        mf.mathVirtualKeyboardPolicy = 'manual';
        mf.setAttribute('math-virtual-keyboard-policy', 'manual');
        mf.setAttribute('menu-items', 'none');
        mf.setAttribute('smart-mode', 'false');
        mf.setAttribute('default-mode', currentDisplay === 'block' ? 'math' : 'inline-math');
        mf.value = currentLatex;
        dom.appendChild(mf);

        // Right dimmed dollar
        const rightDollar = document.createElement('span');
        rightDollar.className = 'md-syntax-dimmed noether-math-delim';
        rightDollar.textContent = delim;
        dom.appendChild(rightDollar);

        // Intercept right click on math-field to suppress MathLive's menu and show Noether's native context menu
        mf.addEventListener('contextmenu', openMathContextMenu, true);

        const commit = () => {
          if (!isEditing) return;
          const newLatex = mf.value;
          currentLatex = newLatex;

          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              if (!newLatex.trim()) {
                editor.commands.deleteRange({ from: pos, to: pos + 1 });
                return;
              }
              editor.commands.updateAttributes('mathChip', { latex: newLatex });
            }
          }
          renderStaticView();
        };

        mf.addEventListener('input', () => {
          currentLatex = mf.value;
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.commands.updateAttributes('mathChip', { latex: currentLatex });
            }
          }
        });

        mf.addEventListener('move-out', (e: any) => {
          const dir = e.detail?.direction;
          if (dir === 'backward' || dir === 'left' || dir === 'upward') {
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos).run();
              }
            }
          } else if (dir === 'forward' || dir === 'right' || dir === 'downward') {
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos + 1).run();
              }
            }
          }
        });

        let lastKeyWasBackslash = false;

        mf.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
            return;
          }

          if (e.key === '\\') {
            lastKeyWasBackslash = true;
            return;
          }

          if (e.key === 'Escape') {
            lastKeyWasBackslash = false;
            e.preventDefault();
            e.stopPropagation();
            commit();
            editor.commands.focus();
          } else if (e.key === 'Enter') {
            lastKeyWasBackslash = false;
            e.preventDefault();
            e.stopPropagation();
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos + 1).run();
              }
            }
          } else if (e.key === '$') {
            const val = (mf.value || '').trim();

            // 1. Literal dollar inside math:
            // Case 1A: If preceded by backslash (\$), or in latex command mode,
            // switch mode back to math and insert \$ into the formula
            if (lastKeyWasBackslash || mf.mode === 'latex' || mf.mode === 'command') {
              lastKeyWasBackslash = false;
              e.preventDefault();
              e.stopPropagation();
              mf.executeCommand(['deleteBackward']);
              mf.executeCommand(['switchMode', 'math']);
              mf.executeCommand(['insert', '\\$']);
              return;
            }

            e.preventDefault();
            e.stopPropagation();
            lastKeyWasBackslash = false;

            // Case 1B: If Alt+$ was pressed, or cursor is positioned inside the formula (before the end),
            // insert \$ into the math formula so users can add currency/dollars within math.
            if (e.altKey || (val && typeof mf.position === 'number' && typeof mf.lastOffset === 'number' && mf.position < mf.lastOffset)) {
              mf.executeCommand(['insert', '\\$']);
              return;
            }

            // 2. Excess dollar escalation when field is empty:
            // Case A: If empty and inline ($), typing a second $ escalates to block mode ($$)
            if (!val && currentDisplay !== 'block') {
              currentDisplay = 'block';
              dom.classList.add('wce-block');
              dom.setAttribute('data-display', 'block');
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.commands.updateAttributes('mathChip', { display: 'block' });
                }
              }
              leftDollar.textContent = '$$';
              rightDollar.textContent = '$$';
              mf.setAttribute('default-mode', 'math');
              return;
            }

            // Case B: If empty and block ($$), typing another $ de-escalates out of math and replaces with literal text
            if (!val && currentDisplay === 'block') {
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  const replacement = useSettingsStore.getState().autoPairMath ? '$$$' : '$$$$';
                  editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).insertContentAt(pos, replacement).run();
                }
              }
              return;
            }

            // 3. Otherwise, closing $ at the end of a non-empty formula commits and steps out after chip
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos + 1).run();
              }
            }
          } else if (e.key === 'Backspace') {
            lastKeyWasBackslash = false;
            const val = (mf.value || '').trim();
            if (!val || val === '\\placeholder{}' || val === '\\square' || val === '') {
              e.preventDefault();
              e.stopPropagation();
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  if (currentDisplay === 'block') {
                    // Backspacing an empty block de-escalates to inline ($)
                    currentDisplay = 'inline';
                    dom.classList.remove('wce-block');
                    dom.setAttribute('data-display', 'inline');
                    editor.commands.updateAttributes('mathChip', { display: 'inline' });
                    leftDollar.textContent = '$';
                    rightDollar.textContent = '$';
                    mf.setAttribute('default-mode', 'inline-math');
                    return;
                  }
                  editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).insertContentAt(pos, '$').run();
                }
              }
            }
          } else {
            lastKeyWasBackslash = false;
          }

          if (e.key === 'ArrowLeft' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const beforePos = mf.position;
            setTimeout(() => {
              if (isEditing && mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos).run();
                  }
                }
              }
            }, 0);
          } else if (e.key === 'ArrowRight' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const beforePos = mf.position;
            setTimeout(() => {
              if (isEditing && mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos + 1).run();
                  }
                }
              }
            }, 0);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
              const beforePos = mf.position;
              mf.executeCommand('moveToPreviousPlaceholder');
              if (mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos).run();
                  }
                }
              }
            } else {
              const beforePos = mf.position;
              mf.executeCommand('moveToNextPlaceholder');
              if (mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos + 1).run();
                  }
                }
              }
            }
          }
        }, true);

        mf.addEventListener('blur', () => {
          if (Date.now() - mountedTime < 250) return;
          setTimeout(() => {
            if (dom.contains(document.activeElement)) return;
            commit();
          }, 80);
        });

        let focusRetries = 0;
        const focusField = () => {
          try {
            if (!mf.isConnected && focusRetries < 20) {
              focusRetries++;
              requestAnimationFrame(focusField);
              return;
            }
            mf.focus();
            if (opts.selectAll) {
              mf.executeCommand('selectAll');
            } else if (opts.fromArrow === 'left') {
              mf.executeCommand('moveToMathFieldEnd');
            } else if (opts.fromArrow === 'right') {
              mf.executeCommand('moveToMathFieldStart');
            } else if (/\\placeholder\{\}/.test(currentLatex)) {
              mf.executeCommand('moveToNextPlaceholder');
            }
          } catch {}
        };
        requestAnimationFrame(focusField);
      }

      // Initial render: immediately enter edit mode if newly inserted with empty latex or placeholder
      if (!currentLatex || currentLatex.includes('\\placeholder')) {
        enterEditMode();
      } else {
        renderStaticView();
      }

      // Right-click context menu on static chip view
      dom.addEventListener('contextmenu', openMathContextMenu, true);

      // Click to edit
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enterEditMode({ selectAll: false });
      });

      // Keydown on chip when focused in view mode
      dom.addEventListener('keydown', (e) => {
        if (isEditing) return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'left' });
          setTimeout(() => {
            if (activeMf) activeMf.executeCommand('deleteBackward');
          }, 20);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'left' });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'right' });
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ selectAll: false });
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'left' });
          setTimeout(() => {
            if (activeMf) activeMf.executeCommand(['insert', e.key]);
          }, 20);
        }
      });

      return {
        dom,
        selectNode: () => {
          if (isEditing) return;
          let fromDirection: 'left' | 'right' = 'right';
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              fromDirection = lastCursorPos > pos ? 'left' : 'right';
            }
          }
          enterEditMode({ fromArrow: fromDirection });
        },
        deselectNode: () => {
          // Handled by blur/commit
        },
        stopEvent: (event: Event) => {
          return isEditing;
        },
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mathChip') return false;
          node = updatedNode;
          if (updatedNode.attrs.display && updatedNode.attrs.display !== currentDisplay) {
            currentDisplay = updatedNode.attrs.display;
            dom.setAttribute('data-display', currentDisplay);
            if (currentDisplay === 'block') {
              dom.classList.add('wce-block');
            } else {
              dom.classList.remove('wce-block');
            }
          }
          if (updatedNode.attrs.latex !== currentLatex && !isEditing) {
            currentLatex = updatedNode.attrs.latex;
            renderStaticView();
          }
          return true;
        },
        destroy: () => {
          editor.off('selectionUpdate', onSelectionUpdate);
          dom.innerHTML = '';
        },
      };
    };
  },
});

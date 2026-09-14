/**
 * @module NativeDocumentDecorators
 * @description
 * Registers core document title decorators for note headers.
 * Adds visual indicators such as locked status badges.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import { DynamicHugeIcon } from '@/components/common/IconPicker';

export function registerNativeDocumentDecorators(app: NoetherApp): void {
  // ── Locked Document Indicator ──
  app.editor.registerDocumentTitleDecorator({
    id: 'native:locked-badge',
    matches: (ctx) => Boolean(ctx.doc && ctx.app.vault.isDocumentLocked(ctx.doc.id)),
    renderSuffix: () => (
      <span
        title="Note is locked (Read-only)"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--noether-text-muted)] bg-[var(--noether-btn-hover-bg)] border border-[var(--noether-border-subtle)] select-none"
      >
        <DynamicHugeIcon iconId="lock-01" size={11} />
        <span>locked</span>
      </span>
    ),
  });
}

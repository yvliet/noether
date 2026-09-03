import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useDocumentStore } from '@/store/documentStore';
import { ItemNoticeBadge, NoticeBadgeVariant } from './ItemNoticeBadge';

export function getBrokenEmbedTooltip(count: number, isFolder = false): string {
  if (isFolder) {
    return count === 1
      ? 'Contains 1 note with missing or broken attachments/embeds.\nYou can disable this alert in Settings > Files and links.'
      : `Contains ${count} notes with missing or broken attachments/embeds.\nYou can disable this alert in Settings > Files and links.`;
  }
  return count === 1
    ? '1 missing or broken attachment/embed detected in this note.\nYou can disable this alert in Settings > Files and links.'
    : `${count} missing or broken attachments/embeds detected in this note.\nYou can disable this alert in Settings > Files and links.`;
}

export interface BrokenEmbedIndicatorProps {
  documentId?: string | null;
  isFolder?: boolean;
  folderBrokenDocCount?: number;
  variant?: NoticeBadgeVariant;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Indicator that alerts the user when an embedded image/file in a note
 * (or within any note in a folder) is missing or broken.
 * Uses the modular ItemNoticeBadge with numeric counts by default.
 */
export const BrokenEmbedIndicator: React.FC<BrokenEmbedIndicatorProps> = React.memo(
  ({
    documentId,
    isFolder = false,
    folderBrokenDocCount,
    variant = 'count',
    position = 'bottom',
    className = '',
  }) => {
    const show = useSettingsStore((s) => s.showBrokenEmbedIndicators);
    const brokenCounts = useDocumentStore((s) => s.brokenEmbedCounts);

    if (!show) return null;

    const count = isFolder
      ? (folderBrokenDocCount || 0)
      : (documentId ? brokenCounts[documentId] || 0 : 0);

    if (count <= 0) return null;

    return (
      <ItemNoticeBadge
        variant={variant}
        count={count}
        tone="warning"
        tooltip={getBrokenEmbedTooltip(count, isFolder)}
        position={position}
        className={className}
      />
    );
  }
);

BrokenEmbedIndicator.displayName = 'BrokenEmbedIndicator';


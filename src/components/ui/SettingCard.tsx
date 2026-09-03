import React from 'react';

export interface SettingCardProps {
  /** Optional title for the setting section header */
  title?: string;
  /** Optional description underneath the section title */
  description?: string;
  /** Optional right-aligned action element in the header (e.g. Restore Defaults button) */
  action?: React.ReactNode;
  /** Inner setting rows or content */
  children: React.ReactNode;
  /** Additional container className */
  className?: string;
}

/**
 * Obsidian-grade grouped settings card container.
 * Encapsulates setting items within a unified rounded surface with subtle borders and dividers.
 */
export const SettingCard: React.FC<SettingCardProps> = ({
  title,
  description,
  action,
  children,
  className = '',
}) => {
  const hasHeader = Boolean(title || description || action);

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-1">
          <div>
            {title && <h3 className="text-sm font-semibold text-[var(--flint-text-primary,#ffffff)] mb-0.5">{title}</h3>}
            {description && <p className="text-[11px] text-[var(--flint-text-muted,#777777)]">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="bg-[var(--flint-bg-card,#202020)] border border-[var(--flint-border-base,#2a2a2a)] rounded-xl overflow-hidden divide-y divide-[var(--flint-border-subtle,#282828)]">
        {children}
      </div>
    </div>
  );
};

/**
 * @module HelpWindow
 * @description
 * Dedicated native window for Noether help and community resources.
 * Mirrors the architecture of SettingsWindow with seamless frameless window controls,
 * centered Noether branding, and instant desktop responsiveness.
 */

import React, { useEffect, useCallback } from 'react';
import {
  WindowMinimizeIcon,
  WindowCloseIcon,
  BookOpen01Icon,
  CodeIcon,
  GithubIcon,
  DiscordIcon,
  NoetherLogoIcon,
} from '@/components/common/Icons';
import { platform } from '@/lib/platform/platformAdapter';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { APP_VERSION, APP_NAME } from '@/version';

export interface HelpWindowContentProps {
  onClose?: () => void;
  isModal?: boolean;
}

interface ResourceItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  url: string;
  isPrimary?: boolean;
}

const RESOURCES: ResourceItem[] = [
  {
    id: 'user-guide',
    icon: <BookOpen01Icon size={26} strokeWidth={1.5} />,
    title: 'User guide',
    description: 'Read the official guide for Noether, markdown formatting, and core workflows.',
    buttonLabel: 'Visit',
    url: 'https://yvliet.github.io/noether/#help/home',
    isPrimary: true,
  },
  {
    id: 'documentation',
    icon: <CodeIcon size={26} strokeWidth={1.5} />,
    title: 'Documentation',
    description: 'Explore architecture blueprints, Extension SDK APIs, and developer guides.',
    buttonLabel: 'Visit',
    url: 'https://yvliet.github.io/noether/#docs/home',
  },
  {
    id: 'github',
    icon: <GithubIcon size={26} />,
    title: 'GitHub repository',
    description: 'Browse source code, report issues, contribute features, and track releases.',
    buttonLabel: 'Visit',
    url: 'https://github.com/yvliet/noether',
  },
  {
    id: 'discord',
    icon: <DiscordIcon size={26} />,
    title: 'Discord server',
    description: 'Join the Noether community on Discord to chat, get help, and share extensions.',
    buttonLabel: 'Join',
    url: 'https://discord.gg/hJr5H4k8vW',
  },
];

export const HelpWindowContent: React.FC<HelpWindowContentProps> = React.memo(({ onClose, isModal = false }) => {
  const handleMinimize = useCallback(() => {
    if (isModal) {
      if (onClose) onClose();
      else useWorkspaceStore.getState().setIsHelpModalOpen(false);
    } else {
      platform.minimize();
    }
  }, [isModal, onClose]);

  const handleClose = useCallback(() => {
    if (isModal && onClose) {
      onClose();
    } else if (platform.isDesktop()) {
      platform.close();
      platform.closeHelpWindow();
    } else if (onClose) {
      onClose();
    } else {
      useWorkspaceStore.getState().setIsHelpModalOpen(false);
    }
  }, [isModal, onClose]);

  useEffect(() => {
    window.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleClose]);

  useEffect(() => {
    if (!isModal) {
      platform.setWindowTitle(`Help ﹕ ${APP_NAME}`);
    }
  }, [isModal]);

  const handleOpenLink = useCallback((url: string) => {
    platform.openUrl(url);
  }, []);

  return (
    <div
      data-help-window="true"
      className={`${
        isModal
          ? 'relative w-[540px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] rounded-xl border border-[var(--noether-border-subtle,#2c2c2c)] shadow-2xl overflow-hidden'
          : 'w-full h-full'
      } flex flex-col bg-[var(--noether-bg-main,#181818)] text-[var(--noether-text-primary,#dcddde)] select-none font-sans overflow-hidden`}
    >
      {/* 1. Seamless Frameless Window Header with Window Controls (no box unless hovered) */}
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (!isModal && e.button === 0 && !(e.target as HTMLElement).closest('button, a, [data-no-drag="true"]')) {
            platform.startDragging();
          }
        }}
        style={{ WebkitAppRegion: isModal ? undefined : 'drag' } as React.CSSProperties}
        className="relative h-9 w-full flex items-center justify-end select-none z-30 shrink-0 bg-transparent cursor-default"
      >
        {/* Top-Right Frameless Controls: Minimize and Close only (no box unless hovered) */}
        <div
          className="flex items-center h-full z-10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          data-no-drag="true"
        >
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            className="h-full w-11 bg-transparent hover:bg-[var(--noether-bg-card-hover,#252525)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer transition-none border-none outline-none"
            title="Minimize"
          >
            <WindowMinimizeIcon size={10} />
          </button>
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="h-full w-11 bg-transparent hover:bg-[#e81123] text-[var(--noether-text-muted,#888)] hover:text-white flex items-center justify-center cursor-pointer transition-none border-none outline-none"
            title="Close"
          >
            <WindowCloseIcon size={10} />
          </button>
        </div>
      </header>

      {/* 2. Main Body Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-1 pb-8 flex flex-col items-center justify-center custom-scrollbar">
        <div className="w-full max-w-[480px] flex flex-col items-center">
          {/* Noether Logo & Branding */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="mb-3 flex items-center justify-center">
              <NoetherLogoIcon size={64} className="select-none pointer-events-none" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--noether-text-primary,#ffffff)]">
              {APP_NAME}
            </h1>
            <span className="text-xs text-[var(--noether-text-muted,#888888)] mt-1">
              Version {APP_VERSION}
            </span>
          </div>

          {/* Resources Directory Card */}
          <div className="w-full bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2a2a2a)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-subtle,#282828)] shadow-sm">
            {RESOURCES.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--noether-bg-card-hover,#242424)]"
              >
                {/* Left Icon (direct glyph without box background) */}
                <div className="shrink-0 flex items-center justify-center text-[var(--noether-text-muted,#888888)] w-8">
                  {item.icon}
                </div>

                {/* Center Title & Description */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--noether-text-primary,#f0f0f0)] leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--noether-text-muted,#888888)] leading-relaxed mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Right Action Button (standard noether-btn style) */}
                <button
                  type="button"
                  onClick={() => handleOpenLink(item.url)}
                  className={`noether-btn ${item.isPrimary ? 'noether-btn-primary' : ''} shrink-0 !px-4 !py-1.5 min-w-[64px]`}
                >
                  {item.buttonLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export const HelpWindow: React.FC = () => {
  return <HelpWindowContent />;
};

export default HelpWindow;

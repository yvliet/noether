import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { platform } from '@/lib/platform/platformAdapter';
import noetherSpinGif from '@/assets/noether_spin.gif';

const AppShell = React.lazy(() => import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })));
const SettingsWindow = React.lazy(() => import('@/components/settings/SettingsWindow').then((m) => ({ default: m.SettingsWindow })));
const HelpWindow = React.lazy(() => import('@/components/help/HelpWindow').then((m) => ({ default: m.HelpWindow })));

const LoadingSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#141414] select-none">
    <img
      src={noetherSpinGif}
      alt="Loading Noether"
      width={36}
      height={36}
      className="w-9 h-9 object-contain select-none pointer-events-none"
      draggable={false}
    />
  </div>
);

export function App() {
  const [windowMode, setWindowMode] = useState<string>(() => {
    return platform.getCurrentWindowLabelSync() || 'main';
  });

  const [activeTab, setActiveTab] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || undefined;
  });

  useEffect(() => {
    // Guarantee the application starts in normal desktop window/maximized mode and never in fullscreen
    platform.setFullscreen(false).catch(() => {});
  }, []);

  useEffect(() => {
    const label = platform.getCurrentWindowLabelSync();
    if (label && label !== windowMode) {
      setWindowMode(label);
    }
  }, [windowMode]);

  useEffect(() => {
    if (windowMode === 'settings') {
      const unsub = platform.onNavigateSettingsTab((tabId) => {
        if (tabId) {
          setActiveTab(tabId);
        }
      });
      return () => {
        unsub();
      };
    }
  }, [windowMode]);

  if (windowMode === 'settings') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <SettingsWindow initialTab={activeTab} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (windowMode === 'help') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <HelpWindow />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <AppShell />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;



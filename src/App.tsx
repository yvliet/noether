import React, { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsWindow } from '@/components/settings/SettingsWindow';

export function App() {
  const [windowMode, setWindowMode] = useState<string>(() => {
    if (typeof window === 'undefined') return 'main';
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('window');
    if (mode) return mode;

    try {
      const internals = (window as any).__TAURI_INTERNALS__;
      const label = internals?.metadata?.currentWindow?.label;
      if (label) return label;
    } catch {}

    return 'main';
  });

  const initialTab = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || undefined;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          const currentWin = getCurrentWindow();
          if (currentWin?.label === 'settings') {
            setWindowMode('settings');
          }
        })
        .catch(() => {});
    }
  }, []);

  if (windowMode === 'settings') {
    return (
      <ErrorBoundary>
        <SettingsWindow initialTab={initialTab} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

export default App;



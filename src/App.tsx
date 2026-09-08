import React, { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsWindow } from '@/components/settings/SettingsWindow';
import { platform } from '@/lib/platform/platformAdapter';

export function App() {
  const [windowMode, setWindowMode] = useState<string>(() => {
    if (typeof window === 'undefined') return 'main';
    const params = new URLSearchParams(window.location.search);
    return params.get('window') || 'main';
  });

  const initialTab = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || undefined;
  }, []);

  useEffect(() => {
    platform.getCurrentWindowLabel().then((label) => {
      if (label === 'settings') {
        setWindowMode('settings');
      }
    }).catch(() => {});
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



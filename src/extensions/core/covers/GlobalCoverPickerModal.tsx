/**
 * @module GlobalCoverPickerModal
 * @description
 * Global modal mounting component registered in Noether's ModalRegistry.
 * Reactively listens to useCoverModalStore to open and close the CoverPickerModal
 * from anywhere in the application (Command Palette, document menu, hover buttons).
 *
 * @since 1.0.0
 */

import React, { useMemo } from 'react';
import { useCoverModalStore } from './coversModalStore';
import { CoverPickerModal } from './CoverPickerModal';
import { useNoetherApp, useVaultDocuments } from 'noether';
import { preloadCoverImage } from './coverPreloader';

export const GlobalCoverPickerModal: React.FC = () => {
  const { isOpen, targetDocId, close } = useCoverModalStore();
  const app = useNoetherApp();
  const documents = useVaultDocuments();

  const targetDoc = useMemo(() => {
    if (!targetDocId) return null;
    return documents.find((d) => d.id === targetDocId) || null;
  }, [documents, targetDocId]);

  const currentProperties = useMemo(() => {
    if (!targetDoc?.properties) return {};
    try {
      return typeof targetDoc.properties === 'string'
        ? JSON.parse(targetDoc.properties)
        : targetDoc.properties;
    } catch {
      return {};
    }
  }, [targetDoc?.properties]);

  const currentUrl = (currentProperties.Cover || '') as string;

  const handleSelect = async (url: string) => {
    if (!targetDocId) return;
    preloadCoverImage(url);
    const nextProps = { ...currentProperties, Cover: url };
    delete nextProps.cover;
    delete nextProps.banner;
    await app.vault.setDocumentProperties(targetDocId, nextProps);
    app.workspace.showToast('Cover image updated', 'success');
  };

  const handleRemove = async () => {
    if (!targetDocId) return;
    const nextProps = { ...currentProperties };
    delete nextProps.Cover;
    delete nextProps.Cover_y;
    delete nextProps.cover;
    delete nextProps.banner;
    delete nextProps.cover_y;
    delete nextProps.banner_y;
    await app.vault.setDocumentProperties(targetDocId, nextProps);
    app.workspace.showToast('Cover image removed', 'info');
  };

  if (!isOpen || !targetDocId) return null;

  return (
    <CoverPickerModal
      isOpen={isOpen}
      currentUrl={currentUrl}
      onSelect={handleSelect}
      onRemove={handleRemove}
      onClose={close}
      app={app}
    />
  );
};

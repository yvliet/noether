import { useState, useCallback, useEffect, useRef } from 'react';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDragDropStore } from '@/store/dragDropStore';
import { useSidebarDockStore, DockZone } from '@/store/sidebarDockStore';
import { computeDragTargets, broadcastDragState } from '@/hooks/useTabReorder';
import { isDescendant } from '@/lib/db/documents';
import { dragTooltipManager, NOTE_ICON_SVG, STICKY_NOTE_02_SVG, FOLDER_SVG } from '@/lib/dragTooltip';
import { fileTypeRegistry, isMediaFileName } from '@/core/registries/FileTypeRegistry';
import { getCachedImageSrc, resolveImageSrcAsync } from '@/components/editor/embed-renderer';
import { useNoetherApp } from '@/core/app/AppContext';

export interface UseTreeDragDropOptions {
  item: DocumentItem | { id: string; title: string; is_folder?: boolean; parent_id?: string | null; doc_type?: string };
  isEditing?: boolean;
  canDrag?: boolean;
  getDisplayTitle?: () => string;
  getIconSvg?: () => string;
  onCustomHover?: (hoveredEl: HTMLElement | null, moveEvent: PointerEvent) => { subtitle?: string; isValid?: boolean } | null | void;
  onCustomDrop?: (hoveredEl: HTMLElement | null, upEvent: PointerEvent) => Promise<boolean | void> | boolean | void;
  onStandardDrop?: (targetParentId: string | null, isMultiDrag: boolean, selectedIds: string[]) => Promise<void> | void;
}

export function useTreeDragDrop({
  item,
  isEditing = false,
  canDrag = true,
  getDisplayTitle,
  getIconSvg,
  onCustomHover,
  onCustomDrop,
  onStandardDrop,
}: UseTreeDragDropOptions) {
  const app = useNoetherApp();
  const selectedDocIds = useDocumentStore((s) => s.selectedDocIds);
  const moveDocuments = useDocumentStore((s) => s.moveDocuments);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const draggedItem = useDragDropStore((s) => s.draggedItem);
  const dragOverFolderId = useDragDropStore((s) => s.dragOverFolderId);
  const setDraggedItem = useDragDropStore((s) => s.setDraggedItem);
  const setDragOverFolder = useDragDropStore((s) => s.setDragOverFolder);
  const resetDragState = useDragDropStore((s) => s.resetDragState);

  const [isDragHovered, setIsDragHovered] = useState(false);
  const hoverTimeoutRef = useRef<any>(null);
  const justDraggedRef = useRef(false);

  const isFolder = !!item.is_folder;
  const isBeingDragged = Boolean(
    draggedItem?.id === item.id ||
      (draggedItem && selectedDocIds.includes(draggedItem.id) && selectedDocIds.includes(item.id))
  );
  const isDropTarget = Boolean(
    isFolder &&
      (dragOverFolderId === item.id || (draggedItem && isDragHovered && !draggedItem.is_folder))
  );

  const handlePointerEnter = useCallback(() => {
    if (useDragDropStore.getState().draggedItem) {
      setIsDragHovered(true);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsDragHovered(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || isEditing || !canDrag) return;

      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('form')) {
        return;
      }

      const startX = e.clientX;
      const startY = e.clientY;
      let hasStartedDrag = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const dist = Math.hypot(dx, dy);

        const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
        const isMultiDrag = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

        if (!hasStartedDrag) {
          if (dist > 5) {
            hasStartedDrag = true;
            justDraggedRef.current = true;
            const displayTitle = getDisplayTitle
              ? getDisplayTitle()
              : fileTypeRegistry.cleanTitle(item.title, item.doc_type) || 'Untitled';
            const iconSvg = getIconSvg ? getIconSvg() : isFolder ? FOLDER_SVG : NOTE_ICON_SVG;

            const allDocs = useDocumentStore.getState().documents;
            const allItems = isMultiDrag
              ? allDocs.filter((d) => currentSelectedIds.includes(d.id))
              : [item as DocumentItem];

            useDragDropStore.getState().startDrag({
              item: item as DocumentItem,
              items: allItems,
              selectedIds: isMultiDrag ? currentSelectedIds : [item.id],
              source: 'file-tree',
              clientX: moveEvent.clientX,
              clientY: moveEvent.clientY,
            });

            dragTooltipManager.show(
              displayTitle,
              isMultiDrag ? `+${currentSelectedIds.length - 1} items` : null,
              iconSvg,
              moveEvent.clientX,
              moveEvent.clientY
            );
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
          }
        }

        if (hasStartedDrag) {
          const allDocs = useDocumentStore.getState().documents;
          dragTooltipManager.updatePosition(moveEvent.clientX, moveEvent.clientY);

          const hoveredEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement | null;
          useDragDropStore.getState().updatePosition(moveEvent.clientX, moveEvent.clientY, hoveredEl);

          // 1. Custom Hover Hook Check
          if (onCustomHover) {
            const customRes = onCustomHover(hoveredEl, moveEvent);
            if (customRes) {
              setDragOverFolder(null, customRes.isValid ?? true);
              broadcastDragState(null);
              dragTooltipManager.updateSubtitle(customRes.subtitle || null);
              return;
            }
          }

          const isOverHeaderOrDock = Boolean(
            hoveredEl?.closest(
              'header, [data-noether-header], [data-split-tab-header], [data-dock-zone]'
            )
          );

          // 2. Tab Bar & Sidebar Dock Zone Check (Always prioritize header/dock targets)
          if (!item.is_folder) {
            const docItemForReorder = { ...item, type: 'document' };
            const targets = computeDragTargets(moveEvent.clientX, moveEvent.clientY, docItemForReorder);
            if (targets.targetDockZone || targets.targetPaneId) {
              broadcastDragState({
                sourceType: 'tree',
                ...targets,
              });
              setDragOverFolder(null, true);
              app.events.emit('editor:drop-ghost', { ghost: null });
              let subtitle: string | null = null;
              if (targets.targetDockZone) {
                if (targets.targetDockZone.endsWith('bottom')) {
                  subtitle = isMultiDrag ? 'Dock to bottom split' : 'Dock to bottom split';
                } else if (targets.targetDockZone === 'left-top') {
                  subtitle = isMultiDrag ? 'Dock to left sidebar' : 'Dock to left sidebar';
                } else {
                  subtitle = isMultiDrag ? 'Dock to right sidebar' : 'Dock to right sidebar';
                }
              } else if (targets.targetPaneId) {
                subtitle = isMultiDrag ? `Open ${currentSelectedIds.length} tabs` : 'Open in tab';
              }
              dragTooltipManager.updateSubtitle(subtitle);
              return;
            }
          }
          broadcastDragState(null);

          // 3. Spatial Canvas Surface Check (only when not over header/dock)
          const canvasEl = !isOverHeaderOrDock
            ? (hoveredEl?.closest('[data-canvas-view="true"]') as HTMLElement | null)
            : null;
          if (canvasEl) {
            setDragOverFolder(null, true);
            app.events.emit('editor:drop-ghost', { ghost: null });
            if (item.is_folder || item.doc_type === 'canvas') {
              dragTooltipManager.updateSubtitle('Cannot add to canvas');
            } else {
              dragTooltipManager.updateSubtitle(
                isMultiDrag ? `Add ${currentSelectedIds.length} notes to canvas` : 'Add note to canvas'
              );
            }
            return;
          }

          // 4. Generic Custom Drop Target DOM Check (only when not over header/dock)
          const customDropTarget = !isOverHeaderOrDock
            ? (hoveredEl?.closest('[data-custom-drop-target="true"]') as HTMLElement | null)
            : null;
          if (customDropTarget) {
            const dropSubtitle = customDropTarget.getAttribute('data-drop-subtitle');
            const targetId =
              customDropTarget.getAttribute('data-tree-item-id') ||
              customDropTarget.getAttribute('data-custom-drop-target-id') ||
              null;
            setDragOverFolder(targetId, true);
            app.events.emit('editor:drop-ghost', { ghost: null });
            dragTooltipManager.updateSubtitle(dropSubtitle || null);
            return;
          }

          // 5. Editor Surface Check (Wikilink & Media Embed Insertion + Live Drop Ghost, only when not over header/dock)
          const editorEl = !isOverHeaderOrDock
            ? (hoveredEl?.closest(
                '.tiptap.prose, [data-editor-canvas="true"], [data-editor-view="true"], .ProseMirror, .cm-editor'
              ) as HTMLElement | null)
            : null;
          if (editorEl) {
            setDragOverFolder(null, true);
            const isMedia = isMediaFileName(item.title);
            const selectedDocs = allDocs.filter((d) => currentSelectedIds.includes(d.id));
            const droppedDocs = isMultiDrag
              ? selectedDocs.length > 0
                ? selectedDocs
                : [item as DocumentItem]
              : [item as DocumentItem];

            if (isMultiDrag) {
              const allMedia = droppedDocs.every((d) => isMediaFileName(d.title));
              const anyMedia = droppedDocs.some((d) => isMediaFileName(d.title));
              if (allMedia) {
                dragTooltipManager.updateSubtitle(`Embed ${droppedDocs.length} media files`);
              } else if (anyMedia) {
                dragTooltipManager.updateSubtitle(`Insert ${droppedDocs.length} links & embeds`);
              } else {
                dragTooltipManager.updateSubtitle(`Link ${droppedDocs.length} notes`);
              }
            } else {
              if (isMedia) {
                dragTooltipManager.updateSubtitle(`Embed “${item.title}”`);
              } else if (item.is_folder) {
                dragTooltipManager.updateSubtitle(`Link folder “${item.title}”`);
              } else {
                const clean = fileTypeRegistry.cleanTitle(item.title) || item.title.replace(/\.md$/, '');
                dragTooltipManager.updateSubtitle(`Link “${clean}”`);
              }
            }

            // Calculate character insertion coordinates and emit live drop ghost preview
            const activeEditor =
              app.editor.getActiveEditor() ||
              (typeof window !== 'undefined' ? (window as any).__noetherEditor : null);
            if (activeEditor && activeEditor.view && !activeEditor.isDestroyed) {
              const docSize = activeEditor.state.doc.content.size;
              let targetPos = Math.max(0, docSize > 1 ? docSize - 1 : docSize);

              const posInfo = activeEditor.view.posAtCoords({
                left: moveEvent.clientX,
                top: moveEvent.clientY,
              });
              if (posInfo && typeof posInfo.pos === 'number') {
                targetPos = posInfo.pos;
              }

              const items = droppedDocs.map((doc) => {
                const isImage = isMediaFileName(doc.title);
                const clean =
                  fileTypeRegistry.cleanTitle(doc.title) || doc.title.replace(/\.md$/, '');
                const token = isImage ? `![[${doc.title}]]` : `[[${clean}]]`;
                const imageSrc = isImage ? getCachedImageSrc(doc.title, doc.id) : null;
                return {
                  token,
                  display: isImage ? doc.title : clean,
                  isImage,
                  imageSrc,
                };
              });

              const previewTokens = items.map((it) => it.token);

              app.events.emit('editor:drop-ghost', {
                ghost: {
                  pos: targetPos,
                  previewTokens,
                  items,
                  totalCount: droppedDocs.length,
                },
              });

              // Pre-fetch any image that isn't cached in memory yet and re-emit when ready
              for (const doc of droppedDocs) {
                if (isMediaFileName(doc.title) && !getCachedImageSrc(doc.title, doc.id)) {
                  resolveImageSrcAsync(doc.title, doc.id).then((src) => {
                    if (src && useDragDropStore.getState().draggedItem) {
                      const updatedItems = droppedDocs.map((d) => {
                        const isImg = isMediaFileName(d.title);
                        const cln =
                          fileTypeRegistry.cleanTitle(d.title) || d.title.replace(/\.md$/, '');
                        return {
                          token: isImg ? `![[${d.title}]]` : `[[${cln}]]`,
                          display: isImg ? d.title : cln,
                          isImage: isImg,
                          imageSrc: isImg ? getCachedImageSrc(d.title, d.id) : null,
                        };
                      });
                      app.events.emit('editor:drop-ghost', {
                        ghost: {
                          pos: targetPos,
                          previewTokens,
                          items: updatedItems,
                          totalCount: droppedDocs.length,
                        },
                      });
                    }
                  });
                }
              }
            }
            return;
          }

          // If not over an editor, clear active drop ghost immediately
          app.events.emit('editor:drop-ghost', { ghost: null });

          // 5. File Tree Node & Root Check
          const targetNode = hoveredEl?.closest('[data-tree-item-id], [data-sidebar-root]');
          if (targetNode) {
            if (targetNode.hasAttribute('data-sidebar-root') && !targetNode.hasAttribute('data-tree-item-id')) {
              const { vaultName } = useWorkspaceStore.getState();
              const currentVault = vaultName || 'Noether Vault';
              if (item.parent_id || isMultiDrag) {
                setDragOverFolder(null, true);
                dragTooltipManager.updateSubtitle(`Move into “${currentVault}”`);
              } else {
                setDragOverFolder(null, false);
                dragTooltipManager.updateSubtitle(null);
              }
            } else {
              const targetId = targetNode.getAttribute('data-tree-item-id');
              const targetIsFolder = targetNode.getAttribute('data-is-folder') === 'true';

              if (!targetId || targetId === item.id || (isMultiDrag && currentSelectedIds.includes(targetId))) {
                setDragOverFolder(null, false);
                dragTooltipManager.updateSubtitle(null);
                return;
              }

              if (targetIsFolder) {
                const targetDoc = allDocs.find((d) => d.id === targetId);
                let isValid = true;
                if (isMultiDrag) {
                  const selectedDocs = allDocs.filter((d) => currentSelectedIds.includes(d.id));
                  const isAnyDescendant = selectedDocs.some(
                    (d) => d.is_folder && isDescendant(targetId, d.id, allDocs)
                  );
                  isValid = !currentSelectedIds.includes(targetId) && !isAnyDescendant;
                } else {
                  const isSelf = item.id === targetId;
                  const isChildDescendant = isFolder && isDescendant(targetId, item.id, allDocs);
                  const isAlreadyInside = item.parent_id === targetId;
                  isValid = !isSelf && !isChildDescendant && !isAlreadyInside;
                }

                if (isValid) {
                  setDragOverFolder(targetId, true);
                  dragTooltipManager.updateSubtitle(`Move into “${targetDoc?.title || 'folder'}”`);

                  if (!hoverTimeoutRef.current) {
                    hoverTimeoutRef.current = setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('noether:expand-folder', { detail: { id: targetId } }));
                      hoverTimeoutRef.current = null;
                    }, 500);
                  }
                } else {
                  setDragOverFolder(null, false);
                  dragTooltipManager.updateSubtitle(null);
                }
              } else {
                const targetDoc = allDocs.find((d) => d.id === targetId);
                if (targetDoc?.parent_id) {
                  const parentFolder = allDocs.find((d) => d.id === targetDoc.parent_id);
                  let isValid = true;
                  if (isMultiDrag) {
                    const selectedDocs = allDocs.filter((d) => currentSelectedIds.includes(d.id));
                    const isAnyDescendant = selectedDocs.some(
                      (d) => d.is_folder && isDescendant(targetDoc.parent_id!, d.id, allDocs)
                    );
                    isValid = !currentSelectedIds.includes(targetDoc.parent_id) && !isAnyDescendant;
                  } else {
                    const isSelf = item.id === targetDoc.parent_id;
                    const isChildDescendant = isFolder && isDescendant(targetDoc.parent_id, item.id, allDocs);
                    const isAlreadyInside = item.parent_id === targetDoc.parent_id;
                    isValid = !isSelf && !isChildDescendant && !isAlreadyInside;
                  }

                  if (isValid) {
                    setDragOverFolder(targetDoc.parent_id, true);
                    dragTooltipManager.updateSubtitle(`Move into “${parentFolder?.title || 'folder'}”`);
                  } else {
                    setDragOverFolder(null, false);
                    dragTooltipManager.updateSubtitle(null);
                  }
                } else {
                  const { vaultName } = useWorkspaceStore.getState();
                  const currentVault = vaultName || 'Noether Vault';
                  if (item.parent_id || isMultiDrag) {
                    setDragOverFolder(null, true);
                    dragTooltipManager.updateSubtitle(`Move into “${currentVault}”`);
                  } else {
                    setDragOverFolder(null, false);
                    dragTooltipManager.updateSubtitle(null);
                  }
                }
              }
            }
          } else {
            setDragOverFolder(null, false);
            dragTooltipManager.updateSubtitle(null);
          }
        }
      };

      const onPointerUp = async (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        app.events.emit('editor:drop-ghost', { ghost: null });

        if (hasStartedDrag) {
          justDraggedRef.current = true;
          setTimeout(() => {
            justDraggedRef.current = false;
          }, 120);

          const allDocs = useDocumentStore.getState().documents;
          dragTooltipManager.hide();

          const hoveredEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY) as HTMLElement | null;
          const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
          const isMultiDrag = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

          // 1. Sidebar Dock Zone & Tab Bar Drop Execution (Always check first)
          if (!item.is_folder) {
            const docItemForReorder = { ...item, type: 'document' };
            const targets = computeDragTargets(upEvent.clientX, upEvent.clientY, docItemForReorder);
            broadcastDragState(null);

            if (targets.targetDockZone && targets.targetSlotIndex !== -1) {
              const zone = targets.targetDockZone;
              const slot = targets.targetSlotIndex;
              const docsToDock = isMultiDrag
                ? allDocs.filter((d) => currentSelectedIds.includes(d.id) && !d.is_folder)
                : [item as DocumentItem];

              for (let i = 0; i < docsToDock.length; i++) {
                const doc = docsToDock[i];
                useSidebarDockStore.getState().dockTab(
                  {
                    id: `doc:${doc.id}`,
                    document_id: doc.id,
                    title: doc.title,
                    view_type: 'document',
                    view_mode: 'document',
                  },
                  zone,
                  slot + i
                );
              }

              const lastDoc = docsToDock[docsToDock.length - 1];
              if (lastDoc) {
                if (zone === 'left-top') {
                  useWorkspaceStore.getState().setActiveLeftView(`doc:${lastDoc.id}` as any);
                  useSidebarDockStore.getState().setActiveItemInZone('left-top', `doc:${lastDoc.id}`);
                  useWorkspaceStore.getState().setIsLeftSidebarOpen(true);
                } else if (zone === 'right-top') {
                  useWorkspaceStore.getState().setActiveRightTab(`doc:${lastDoc.id}` as any);
                  useSidebarDockStore.getState().setActiveItemInZone('right-top', `doc:${lastDoc.id}`);
                  useWorkspaceStore.getState().setIsRightSidebarOpen(true);
                } else if (zone === 'left-bottom') {
                  useSidebarDockStore.getState().setActiveItemInZone('left-bottom', `doc:${lastDoc.id}`);
                  useWorkspaceStore.getState().setIsLeftSidebarOpen(true);
                } else if (zone === 'right-bottom') {
                  useSidebarDockStore.getState().setActiveItemInZone('right-bottom', `doc:${lastDoc.id}`);
                  useWorkspaceStore.getState().setIsRightSidebarOpen(true);
                }
              }

              resetDragState();
              return;
            } else if (targets.targetPaneId && targets.targetSlotIndex !== -1) {
              const targetPaneId = targets.targetPaneId;
              const docsToOpen = isMultiDrag
                ? allDocs.filter((d) => currentSelectedIds.includes(d.id) && !d.is_folder)
                : [item as DocumentItem];

              for (let i = 0; i < docsToOpen.length; i++) {
                const doc = docsToOpen[i];
                useWorkspaceStore.getState().openTabInPane(targetPaneId, doc.id, doc.title, {
                  newTab: true,
                  insertIndex: targets.targetSlotIndex + i,
                });
              }
              useWorkspaceStore.getState().setFocusedPane(targetPaneId);
              resetDragState();
              return;
            }
          }

          broadcastDragState(null);

          const isOverHeaderOrDock = Boolean(
            hoveredEl?.closest(
              'header, [data-noether-header], [data-split-tab-header], [data-dock-zone]'
            )
          );

          // 2. Spatial Canvas Surface & Custom Drop Target Execution (only when not over header/dock)
          const canvasEl = !isOverHeaderOrDock
            ? (hoveredEl?.closest('[data-canvas-view="true"]') as HTMLElement | null)
            : null;
          const customDropTarget = !isOverHeaderOrDock
            ? (hoveredEl?.closest('[data-custom-drop-target="true"]') as HTMLElement | null)
            : null;

          if (canvasEl || customDropTarget) {
            broadcastDragState(null);
            if (onCustomDrop) {
              const handled = await onCustomDrop(hoveredEl, upEvent);
              if (handled) {
                resetDragState();
                return;
              }
            }

            const customDropEvent = new CustomEvent('noether:custom-drop', {
              detail: {
                item,
                selectedIds: isMultiDrag ? currentSelectedIds : [item.id],
                targetEl: hoveredEl,
                clientX: upEvent.clientX,
                clientY: upEvent.clientY,
                handled: false,
              },
              cancelable: true,
            });
            window.dispatchEvent(customDropEvent);

            // Never fall through to opening a new tab when dropping onto canvas or a custom drop surface
            resetDragState();
            return;
          }

          // 3. Editor Surface Drop Execution (Wikilink & Media Embed Insertion, only when not over header/dock)
          const editorEl = !isOverHeaderOrDock
            ? (hoveredEl?.closest(
                '.tiptap.prose, [data-editor-canvas="true"], [data-editor-view="true"], .ProseMirror, .cm-editor'
              ) as HTMLElement | null)
            : null;

          if (editorEl) {
            broadcastDragState(null);
            useDragDropStore.getState().endDrag({ dropTarget: editorEl });
            resetDragState();
            return;
          }

          // 4. Standard Drop Execution
          const { dragOverFolderId, isTargetValid } = useDragDropStore.getState();
          if (isTargetValid) {
            if (onStandardDrop) {
              await onStandardDrop(dragOverFolderId || null, isMultiDrag, currentSelectedIds);
            } else if (isMultiDrag) {
              const targetParentId = dragOverFolderId || null;
              const res = await moveDocuments(currentSelectedIds, targetParentId);
              if (res.success) {
                if (targetParentId) {
                  const targetFolder = allDocs.find((d) => d.id === targetParentId);
                  window.dispatchEvent(new CustomEvent('noether:expand-folder', { detail: { id: targetParentId } }));
                  showToast(`Moved ${res.movedCount} items into “${targetFolder?.title || 'folder'}”`, 'success');
                } else {
                  showToast(`Moved ${res.movedCount} items to root`, 'success');
                }
              } else if (res.error) {
                showToast(res.error, 'warning');
              }
            }
          }
          resetDragState();
        } else {
          broadcastDragState(null);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [
      isEditing,
      canDrag,
      item,
      isFolder,
      getDisplayTitle,
      getIconSvg,
      onCustomHover,
      onCustomDrop,
      onStandardDrop,
      setDraggedItem,
      setDragOverFolder,
      resetDragState,
      moveDocuments,
      showToast,
    ]
  );

  return {
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    isBeingDragged,
    isDropTarget,
    isDragHovered,
    hasJustDragged: useCallback(() => justDraggedRef.current, []),
  };
}

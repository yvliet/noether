import { useState, useCallback, useEffect, useRef } from 'react';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDragDropStore } from '@/store/dragDropStore';
import { useSidebarDockStore, DockZone } from '@/store/sidebarDockStore';
import { computeDragTargets, broadcastDragState } from '@/hooks/useTabReorder';
import { isDescendant } from '@/lib/db/documents';
import { dragTooltipManager, STICKY_NOTE_02_SVG, FOLDER_SVG } from '@/lib/dragTooltip';

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
  const allDocs = useDocumentStore((s) => s.documents);
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
            const displayTitle = getDisplayTitle
              ? getDisplayTitle()
              : item.doc_type === 'canvas' || item.title.toLowerCase().endsWith('.canvas')
              ? item.title.toLowerCase().endsWith('.canvas')
                ? item.title
                : `${item.title}.canvas`
              : item.title || 'Untitled';
            const iconSvg = getIconSvg ? getIconSvg() : isFolder ? FOLDER_SVG : STICKY_NOTE_02_SVG;

            setDraggedItem(item as DocumentItem);
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
          dragTooltipManager.updatePosition(moveEvent.clientX, moveEvent.clientY);

          const hoveredEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement | null;

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

          // 2. Generic Custom Drop Target DOM Check
          const customDropTarget = hoveredEl?.closest('[data-custom-drop-target="true"]') as HTMLElement | null;
          if (customDropTarget) {
            const dropSubtitle = customDropTarget.getAttribute('data-drop-subtitle');
            const targetId =
              customDropTarget.getAttribute('data-tree-item-id') ||
              customDropTarget.getAttribute('data-custom-drop-target-id') ||
              null;
            setDragOverFolder(targetId, true);
            broadcastDragState(null);
            dragTooltipManager.updateSubtitle(dropSubtitle || null);
            return;
          }

          // 3. Tab Bar & Sidebar Dock Zone Check - uses the exact same indicator like everything does
          if (!item.is_folder) {
            const docItemForReorder = { ...item, type: 'document' };
            const targets = computeDragTargets(moveEvent.clientX, moveEvent.clientY, docItemForReorder);
            // Flint Rule 2 Rationale ("Why This, Not That"):
            // Prevent dragging folders/files from nav into docking zones that exist in the nav sidebar
            // ('left-top', 'left-bottom'). Tree reorganization in the nav sidebar must remain snappy
            // and never accidentally trigger nav sidebar docking. Tabs (from editor tab headers) and dock
            // items (from secondary icon bars) are handled via useTabReorder and remain fully dockable.
            if (targets.targetDockZone && targets.targetDockZone.startsWith('left')) {
              targets.targetDockZone = null;
            }
            if (targets.targetDockZone || targets.targetPaneId) {
              broadcastDragState({
                sourceType: 'tree',
                ...targets,
              });
              setDragOverFolder(null, true);
              dragTooltipManager.updateSubtitle(isMultiDrag ? `+${currentSelectedIds.length - 1} items` : null);
              return;
            }
          }
          broadcastDragState(null);

          // 4. File Tree Node & Root Check
          const targetNode = hoveredEl?.closest('[data-tree-item-id], [data-sidebar-root]');
          if (targetNode) {
            if (targetNode.hasAttribute('data-sidebar-root') && !targetNode.hasAttribute('data-tree-item-id')) {
              const { hearthName, vaultName } = useWorkspaceStore.getState();
              const currentHearth = hearthName || vaultName || 'Flint Hearth';
              if (item.parent_id || isMultiDrag) {
                setDragOverFolder(null, true);
                dragTooltipManager.updateSubtitle(`Move into “${currentHearth}”`);
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
                      window.dispatchEvent(new CustomEvent('flint:expand-folder', { detail: { id: targetId } }));
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
                  const { hearthName, vaultName } = useWorkspaceStore.getState();
                  const currentHearth = hearthName || vaultName || 'Flint Hearth';
                  if (item.parent_id || isMultiDrag) {
                    setDragOverFolder(null, true);
                    dragTooltipManager.updateSubtitle(`Move into “${currentHearth}”`);
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

        if (hasStartedDrag) {
          dragTooltipManager.hide();

          const hoveredEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY) as HTMLElement | null;
          const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
          const isMultiDrag = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

          // 1. Sidebar Dock Zone & Tab Bar Drop Execution
          if (!item.is_folder) {
            const docItemForReorder = { ...item, type: 'document' };
            const targets = computeDragTargets(upEvent.clientX, upEvent.clientY, docItemForReorder);
            if (targets.targetDockZone && targets.targetDockZone.startsWith('left')) {
              targets.targetDockZone = null;
            }
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

              for (const doc of docsToOpen) {
                useWorkspaceStore.getState().openTabInPane(targetPaneId, doc.id, doc.title);
              }
              useWorkspaceStore.getState().setFocusedPane(targetPaneId);
              resetDragState();
              return;
            }
          }

          broadcastDragState(null);

          // 2. Custom Drop Handler
          if (onCustomDrop) {
            const handled = await onCustomDrop(hoveredEl, upEvent);
            if (handled) {
              resetDragState();
              return;
            }
          }

          // 3. Generic Custom Drop Event
          const customDropEvent = new CustomEvent('flint:custom-drop', {
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

          if (customDropEvent.defaultPrevented || (customDropEvent.detail && customDropEvent.detail.handled)) {
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
                  window.dispatchEvent(new CustomEvent('flint:expand-folder', { detail: { id: targetParentId } }));
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
      allDocs,
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
  };
}

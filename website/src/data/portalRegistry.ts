import { DocNode, PortalSection } from '../types';
import { HELP_TREE, HELP_DOCS_FLAT, findHelpDocBySlug } from './helpContent';
import { DOCS_TREE, DOCS_FLAT, findDocsDocBySlug } from './docsContent';

export { HELP_TREE, HELP_DOCS_FLAT, DOCS_TREE, DOCS_FLAT };

export const ALL_DOCS_COMBINED: DocNode[] = [...HELP_DOCS_FLAT, ...DOCS_FLAT];

/**
 * Searches across both Noether Help and Noether Docs to find a matching document.
 * Returns the matching DocNode and the portal section it belongs to.
 */
export function findDocAcrossPortals(
  slugOrTarget: string,
  preferredPortal?: PortalSection
): { doc: DocNode; portal: PortalSection } | null {
  const target = slugOrTarget.toLowerCase().replace(/^\/+|\/+$/g, '');

  // If a preferred portal is specified, check that first
  if (preferredPortal === 'help') {
    const helpDoc = findHelpDocBySlug(target);
    if (helpDoc) return { doc: helpDoc, portal: 'help' };
    const docsDoc = findDocsDocBySlug(target);
    if (docsDoc) return { doc: docsDoc, portal: 'docs' };
  } else if (preferredPortal === 'docs') {
    const docsDoc = findDocsDocBySlug(target);
    if (docsDoc) return { doc: docsDoc, portal: 'docs' };
    const helpDoc = findHelpDocBySlug(target);
    if (helpDoc) return { doc: helpDoc, portal: 'help' };
  } else {
    const helpDoc = findHelpDocBySlug(target);
    if (helpDoc) return { doc: helpDoc, portal: 'help' };
    const docsDoc = findDocsDocBySlug(target);
    if (docsDoc) return { doc: docsDoc, portal: 'docs' };
  }

  return null;
}

/**
 * Computes adjacent previous and next documents within a given tree.
 */
export function getAdjacentDocsInTree(
  currentSlug: string,
  treeNodes: DocNode[]
): { prev?: DocNode; next?: DocNode } {
  const flat = treeNodes.filter((n) => Boolean(n.content));
  const index = flat.findIndex(
    (item) =>
      item.slug.toLowerCase() === currentSlug.toLowerCase() ||
      item.id.toLowerCase() === currentSlug.toLowerCase()
  );

  if (index === -1) return {};

  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}

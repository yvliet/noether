/**
 * @module communityRegistry
 * @description
 * Static metadata catalog for well-known Flint community extensions.
 * Provides fallback metadata for offline discovery and repository resolution
 * without importing UI components or extension runtime code.
 *
 * @since 0.4.0
 */

export interface KnownExtensionMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  repoUrl: string;
  description: string;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
}

export const KNOWN_COMMUNITY_EXTENSIONS: KnownExtensionMetadata[] = [
  {
    id: 'flint-cascade',
    name: 'Cascade',
    version: '1.0.1',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    repoUrl: 'https://github.com/yvliet/flint-cascade',
    description:
      'Organize notes into sequential cascades (books) with status-bar linking, graph backlinks, and custom sidebar folders.',
    category: 'Productivity',
  },
  {
    id: 'flint-copilot',
    name: 'Copilot',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    repoUrl: 'https://github.com/yvliet/flint-copilot',
    description:
      'Native AI assistant with local LLM integration, multimodal reasoning, automated summarization, and context-aware chat.',
    category: 'Productivity',
  },
  {
    id: 'quicknote',
    name: 'Quicknote',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    repoUrl: 'https://github.com/yvliet/flint-quicknote',
    description:
      'Instant floating scratchpad for capturing thoughts, web snippets, and ideas without leaving your current note.',
    category: 'Productivity',
  },
  {
    id: 'fsrs-spaced-repetition',
    name: 'Spaced Repetition (FSRS)',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    repoUrl: 'https://github.com/yvliet/flint-fsrs',
    description:
      'State-of-the-art Free Spaced Repetition Scheduler (FSRS) flashcard review system built right inside Flint.',
    category: 'Productivity',
  },
];

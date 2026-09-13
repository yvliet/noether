# Editor Engine & Live Preview

A technical breakdown of Noether's Live Preview editor architecture, built on TipTap 2.x and ProseMirror.

## 1. Why Live Preview over Pure Source or WYSIWYG?
---

Traditional note-taking editors generally fall into one of two extremes:
1. **Raw Markdown Split Views**: The left pane shows raw markdown syntax with hashes and asterisks; the right pane renders an HTML preview. This divides the screen and forces your eyes to constantly jump between two windows.
2. **Pure WYSIWYG**: Hides the Markdown syntax completely behind visual rich text. While pretty, editing tables, mathematical equations, or code fences becomes awkward when the exact underlying text formatting is obscured.

Noether implements a **Live Preview Architecture**:
- When your cursor is outside a formatted block, it renders as rich typography, live math, interactive checkboxes, and callout containers.
- When your cursor moves inside a formatted element, the underlying Markdown tokens (`**bold**`, `[[wikilink]]`, `$E=mc^2$`) dynamically unveil themselves right under your cursor for instant editing.

## 2. $O(1)$ Transaction Decoration Mapping
---

A major failure mode in Electron and web-based editors is typing latency on long documents (50,000+ words). If an editor re-scans the entire document AST on every keystroke, typing latency degrades to 80ms+, causing perceptible visual stutter.

To maintain sub-8ms input latency on 100,000+ word notes, Noether employs **incremental transaction decoration mapping**:

```
[ User Keystroke at Pos 1,420 ]
  │
  ├── 1. ProseMirror Transaction dispatches
  │
  ├── 2. Map Existing Decorations:
  │      DecorationSet.map(tr.mapping) → O(K) where K = active decorations
  │
  └── 3. Rescan ONLY Dirty Block:
         Check paragraph [1,400 .. 1,460] for wikilinks or tags
```

Rather than re-parsing the entire document, ProseMirror updates the integer position coordinates of existing decorations through mathematical translation offsets. Only the specific paragraph being typed in is re-scanned for markdown syntax.

## 3. In-Memory $KaTeX$ Memoization
---

Mathematical equations rendered via $KaTeX$ can be computationally expensive to tokenize and render into DOM elements on every frame.

Noether memoizes rendered equation DOM nodes in an in-memory LRU cache keyed by equation source string and display mode (`inline` vs `display`). When you type in a paragraph at the top of a research paper, hundreds of complex mathematical formulas further down the page are retrieved from memory in zero milliseconds without re-invoking the $KaTeX$ compilation parser.

## 4. Bounded Undo Stack Memory Hygiene
---

In long-running editing sessions, ProseMirror's undo/redo history can capture hundreds of step inversions, bloating heap memory by hundreds of megabytes.

Noether enforces a strict **bounded undo stack of 50 snapshots**. Old history steps are pruned automatically, ensuring your editing buffer maintains a lightweight, constant memory footprint regardless of whether you have been writing for five minutes or five hours.

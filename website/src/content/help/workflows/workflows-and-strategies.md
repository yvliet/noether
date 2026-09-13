# Workflows & Note Strategies

There is no single "correct" way to take notes, but there are definitely ways to avoid drowning in your own filesystem. Here is a look at practical, battle-tested workflows in Noether that keep your vault clean, scannable, and friction-free.

## 1. The Big Topic & Scoped Subfolder Structure
---

A common trap with digital notes is falling into one of two extremes:
1. **The Single Flat Bucket**: Dumping every single note into the root directory or one giant `Notes/` folder, relying purely on search and graph. This works until you want to browse by context or review a project hierarchy.
2. **The 10-Level Nesting Maze**: Creating endless categories like `Work/Clients/2026/Q3/Meetings/Notes/` where finding anything requires clicking through seven empty folders.

### How I Organize My Own Vault

Personally, I use a balanced setup:
- Create **3 to 5 big topic folders** at the vault root (e.g. `Life/`, `Projects/`, `Archive/`).
- Inside each big topic folder, create **shallow, scoped subfolders** for specific domains.

Here is a look at how that looks in practice:

```
My-Vault/
├── Life/
│   ├── Goals.md
│   ├── Personal/
│   │   ├── Workout Routine.md
│   │   └── Reading List.md
│   └── Finances/
│       └── Budget 2026.md
├── Projects/
│   ├── Noether/
│   │   ├── Architecture Plan.md
│   │   └── Extension Roadmap.md
│   └── Website Redesign/
│       └── Brand Tokens.md
├── Journal/
│   └── 2026-09-13.md
└── Archive/
    └── Old Notes 2025/
```

This structure gives you immediate scannability in the left sidebar without cluttering your daily view.

## 2. Daily Scratchpad & Journaling
---

When ideas, quick code snippets, or thoughts pop into your head during the day, don't waste mental energy deciding what folder to file them into.

1. Press `Ctrl+J` (or open Command Palette: `Ctrl+K` → *Open Today's Journal*).
2. Type out whatever is on your mind as quick bullet points or checklists.
3. If a thought in your journal grows into a larger idea or project plan, select the text, wrap it in a wikilink like `[[New Project Idea]]`, and click the link to create a standalone document.

Your daily journal acts as an intake funnel: write fast, link concepts when they become interesting, and review your tasks anytime from the Tasks Dashboard (`Ctrl+T`).

## 3. Visual Thinking on the Spatial Canvas
---

Linear text documents are great for deep writing and reading, but when you are brainstorming or connecting disparate concepts, visual space matters.

- Use the **Spatial Canvas** (`Ctrl+Shift+C`) to create freeform whiteboards.
- Drag notes straight from your file tree onto the canvas as cards.
- Add sticky notes for quick remarks, group related concepts inside colored bounding boxes, and draw directional connector arrows between them.
- Because canvas files are stored as plain JSON alongside your notes, everything remains local and revision-controllable.

## 4. Flashcards & Active Recall (FSRS-4.5)
---

If you are studying a language, preparing for technical interviews, or memorizing key facts, you don't need a separate app like Anki:

- Inside any note, write question/answer pairs using standard question markers (`Q: ... A: ...` or double colons `Term::Definition`).
- Open the Review Deck modal to test your memory.
- Noether runs the modern **FSRS-4.5 (Free Spaced Repetition Scheduler)** algorithm to compute retention probabilities mathematically, giving you optimal review intervals without cramming.

## 5. Instant Keyboard Capture
---

Thanks to Noether's zero-animation architecture, you can fly through your vault using keyboard shortcuts:
- `Ctrl+K`: Jump to any note or execute any command instantly.
- `Ctrl+N`: Create a new note immediately in the active folder.
- `Ctrl+\ `: Toggle the left sidebar on or off.
- `Ctrl+Shift+\ `: Toggle the right sidebar (backlinks & docked graph).

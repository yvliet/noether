export const fsrsReadme = `# Spaced Repetition (FSRS-4.5)

Free Spaced Repetition Scheduler (FSRS-4.5) engine embedded directly into notes and interactive flashcard reviews.

---

## Overview

The **Spaced Repetition (FSRS)** extension transforms your notes into an automated learning and retention system. Instead of maintaining external flashcard databases, cards are parsed directly from note Markdown using lightweight notation.

---

## Flashcard Syntax Reference

- **Concept Card (\`::\`)**: \`Term :: Definition\`
- **Bidirectional Card (\`;;\`)**: \`Front ;; Back\` (Creates 2 reversible cards)
- **Cloze Deletion (\`{...}\`)**: \`The capital of France is {Paris}.\`

---

## Architecture & Flint APIs

This extension showcases slash command templates, status bar review counters, and global review modals.

### 1. Slash Commands Insertion
Registers quick insertion templates into Flint's TipTap slash command menu:

\`\`\`tsx
this.app.commands.registerCommand({
  id: 'fsrs:insert-concept-card',
  name: 'Concept Flashcard',
  icon: <SparklesIcon size={14} />,
  callback: () => {
    this.app.editor.insertText('Concept :: Definition');
  },
});
\`\`\`

### 2. Status Bar Due Counter
Shows real-time flashcards due today across the hearth:

\`\`\`tsx
this.app.statusBar.registerStatusBarItem({
  id: 'fsrs-due-counter',
  position: 'right',
  render: () => <FsrsStatusBarCounter />,
});
\`\`\`

---

## FSRS-4.5 Algorithm Implementation

The extension implements the modern **FSRS-4.5 (Free Spaced Repetition Scheduler)** mathematical model:
- **Stability ($S$)**: The time in days for recall probability to decline from 100% to 90%.
- **Difficulty ($D$)**: Inherent complexity rating (1 to 10).
- **Retrievability ($R$)**: Current probability of recall $R(t) = (1 + 19 \\cdot t / (9 \\cdot S))^{-0.5}$.

Ratings: \`Again (1)\`, \`Hard (2)\`, \`Good (3)\`, \`Easy (4)\`.

---

## Developer Guide: Custom Study Modes

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class AudioReviewExtension extends Extension {
  async onload() {
    this.app.events.on('fsrs:card-revealed', ({ card }) => {
      // Text-to-speech pronunciation on card flip
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(card.back);
        window.speechSynthesis.speak(utterance);
      }
    });
  }
}
\`\`\`
`;

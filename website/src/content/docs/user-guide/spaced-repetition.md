# Embedded FSRS Spaced Repetition

Flint incorporates a state-of-the-art **Spaced Repetition Review Engine** directly into your everyday note-taking workflow. Powered by the modern **FSRS-4.5 algorithm (Free Spaced Repetition Scheduler)** via `ts-fsrs`, Flint turns plain Markdown notes into high-efficiency active recall flashcards without requiring external apps like Anki.

---

## 1. Why FSRS-4.5 over Traditional SM-2?

Most legacy flashcard systems rely on the SuperMemo-2 (SM-2) algorithm from 1987, which uses heuristic "ease factors" that lead to card scheduling collapse (the "ease hell" trap).

Flint uses **FSRS-4.5**, a modern mathematical memory model based on empirical human memory retention studies:

- **Two-Component Memory Model**: Separates memory **Stability** ($S$, how long a memory trace endures in days) and **Difficulty** ($D$, the intrinsic complexity of the subject matter).
- **Target Retention Calibration**: Lets you configure an exact retention goal (e.g. 90%), dynamically calculating review intervals to achieve that rate with the fewest reviews possible.
- **Adaptive Scheduling**: Card intervals expand exponentially when recalled easily and adjust smoothly when forgotten, without penalizing future ease indefinitely.

---

## 2. Inline Markdown Flashcard Syntax

You never have to switch into a dedicated card authoring menu. Write flashcards directly in your notes using three intuitive syntax formats:

### 1. Concept Cards (`::`)
A single-direction question and answer pair:
```markdown
What is Write-Ahead Logging (WAL) in SQLite? :: A transaction log mechanism where changes are appended to a separate log file before modifying the primary database pages.
```

### 2. Bidirectional Cards (`;;`)
Generates **two** independent study cards (Forward: $A \to B$ and Reverse: $B \to A$), ideal for language learning, medical terminology, and code definitions:
```markdown
Ephemeral Port Range ;; 49152 to 65535
```
- Card 1 tests: *"Ephemeral Port Range"* $\to$ Reveals: *"49152 to 65535"*
- Card 2 tests: *"49152 to 65535"* $\to$ Reveals: *"Ephemeral Port Range"*

### 3. Cloze Deletion Cards (`{...}` or `==...==`)
Hide specific keywords within a contextual sentence:
```markdown
In Flint, disk text files are the single source of truth, while {flint.sqlite} acts as an embedded relational query accelerator.
```
Or use standard Markdown highlights:
```markdown
The Tauri v2 architecture uses ==rusqlite== with WAL mode for native persistence.
```

---

## 3. The Study Review Deck

Launch the study session by clicking the **Flashcards** icon on the left Action Rail or selecting *Review Due Cards* from the Command Palette (`Ctrl+K`).

During a review session, Flint presents flashcards sequentially with prompt, answer reveal, and interval forecasts:

- **Prompt (Front)**: The question extracted from your note (e.g. *What is Write-Ahead Logging (WAL) in SQLite?*).
- **Reveal**: Press `Space` or click **Show Answer** to reveal the answer.
- **Grading Responses**: Grade your recall using keys `1` to `4` or the rating buttons:
  - `1` **Again** (`< 10m`): Complete blackout or incorrect answer; resets card to the learning queue.
  - `2` **Hard** (`1.2d`): Recalled with substantial effort; advances interval conservatively.
  - `3` **Good** (`3.5d`): Standard correct recall; advances stability according to the FSRS model.
  - `4` **Easy** (`7.1d`): Instant, effortless recall; advances interval significantly.

Estimated review intervals for each grade are calculated in real time by the FSRS algorithm and displayed directly on the rating buttons.

---

## 4. Background Reconciliation & Data Safety

- **Deterministic Card Keys**: Flashcards compute deterministic content hashes and document IDs. If you reorganize or rename your note files, Flint reconciles card history seamlessly.
- **Relational Integrity**: Card review states (stability, difficulty, due dates, review logs) are stored in the local SQLite database.
- **Cascade Cleanup**: If a note containing flashcards is deleted or moved to `.trash/`, its associated cards are cleaned up automatically.

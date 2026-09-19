# Properties

Visual editor for YAML frontmatter at the top of notes.

## 1. Frontmatter Controls
---

Click **Add property** above the note title to attach structured metadata:

```yaml
---
title: Research Notes
status: in-progress
tags: [physics, lab]
date: 2026-09-19
rating: 5
---
```

Supported property types include:
- **Text**: Single line string.
- **List / Multi-select**: Tag pills or string arrays.
- **Number**: Numeric inputs with stepper controls.
- **Checkbox**: Boolean `true` / `false` switches.
- **Date & Time**: Date picker.

## 2. Views & Searching
---

- **Toggle Raw YAML**: Switch between visual form inputs and raw YAML text from the property menu or via `Command Palette → Properties: Toggle view mode`.
- **Property Search**: Search notes by property keys or values in the search bar using `[status:in-progress]` or `[rating:5]`.
- **Delete Property**: Click the menu next to any property row and select **Delete property**.

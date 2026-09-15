# Properties

Properties provides a clean, visual interface to edit YAML frontmatter metadata at the top of your notes with typed property controls.

## 1. Overview
---

Frontmatter properties allow you to store structured information about a note, such as tags, status, dates, author, or custom categories. Properties are stored as standard YAML frontmatter at the top of your `.md` files:

```yaml
---
title: Research Findings
status: in-progress
tags:
  - physics
  - notes
date: 2026-09-16
rating: 5
---
```

## 2. Add and Edit Properties
---

1. Click **Add property** at the top of any open note (above the title).
2. Type a property name (e.g. `status` or `priority`).
3. Select a property type from the dropdown:
   - **Text**: Single line of plain text.
   - **List / Multi-select**: Array of tag pills or strings.
   - **Number**: Numeric value with step controls.
   - **Checkbox**: Boolean `true` / `false` toggle.
   - **Date / Time**: Interactive calendar and date picker.
4. Enter the value. Changes save directly to the file's YAML block.

## 3. Manage Properties Across Vault
---

- **Global Property Search**: Search for notes containing specific property keys or values using the search syntax `[status:done]`.
- **Delete Property**: Click the menu (`...`) next to any property row and select **Delete property**.

## 4. Settings & Display Modes
---

Open **Settings (`Ctrl+,`) → Properties** to configure display preferences:

- **Display Mode**: Choose between **Visible**, **Collapsed**, or **Source (raw YAML text)**.
- **Auto-Sort**: Automatically order properties alphabetically.

## 5. Keyboard Shortcuts & Commands
---

| Command | Action |
| :--- | :--- |
| `Command Palette → Properties: Add property` | Focus add property input |
| `Command Palette → Properties: Toggle view mode` | Switch between visual pills and raw YAML |

> [!TIP]
> Properties are indexed by Noether's local SQLite engine, making property-based search queries instantaneous even across large vaults.

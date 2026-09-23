# Callouts

Callouts let you highlight important notes, warnings, tips, and quotes in clean, color-coded callout boxes.

## 1. Writing Callouts
---

To create a callout, write a blockquote where the first line starts with `> [!TYPE]`:

```markdown
> [!NOTE]
> This is a helpful context note.

> [!TIP]
> Use Ctrl+K to open the Command Palette from anywhere.

> [!WARNING]
> Moving files outside of Noether can break relative attachments.
```

You can also add a custom title after the badge:

```markdown
> [!NOTE] Project Overview
> Here are the key goals for this quarter.
```

## 2. All 11 Callout Types
---

Noether includes 11 visual badge styles:

<details open>
<summary><b>Callout Badges Reference</b></summary>

> [!NOTE]
> **NOTE**: General information and helpful background details.

> [!TIP]
> **TIP**: Best practices, efficiency suggestions, and useful tricks.

> [!IMPORTANT]
> **IMPORTANT**: Crucial instructions that require user attention.

> [!WARNING]
> **WARNING**: Caution notices, breaking changes, and potential pitfalls.

> [!CAUTION]
> **CAUTION**: High-risk actions that could cause data loss.

> [!INFO]
> **INFO**: Factual notifications and status summaries.

> [!QUESTION]
> **QUESTION**: Frequently asked questions and clarification items.

> [!TODO]
> **TODO**: Outstanding action items and planned tasks.

> [!EXAMPLE]
> **EXAMPLE**: Code demonstrations and sample workflows.

> [!QUOTE]
> **QUOTE**: Attributed citations and memorable quotations.

> [!BUG]
> **BUG**: Known defects, error codes, and troubleshooting advice.

</details>

## 3. Foldable Callouts
---

You can make callouts expandable or collapsible by adding a `+` or `-` directly after the badge name:

- **Expanded by default (`+`)**:
  ```markdown
  > [!NOTE]+ Click to collapse
  > This callout starts open, but readers can click the header to collapse it.
  ```

- **Collapsed by default (`-`)**:
  ```markdown
  > [!TIP]- Click to expand
  > This callout starts collapsed, saving vertical space until clicked.
  ```

## 4. Next Steps
---

- Return to [[Editor]] for mode switching and editor options.
- Review text styling in [[Basic Formatting]].
- Organize your vault in [[Vaults & Storage]].

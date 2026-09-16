# Introduction to Noether

It was one evening on August 25, 2026, when I decided that I needed a single dedicated folder on my own computer to store my life. I wanted a personal knowledge base where my thoughts, notes, and context could live in one local place, so I didn't have to re-explain who I was or what I was doing every single time I talked to an AI.

At first I thought, *“Obsidian is there.”*

> [!QUOTE]
> “Nah, I don't want to use Obsidian. It seems way too complicated and... too intimidating.”

The settings felt overwhelming, figuring out community plugins felt like looking for a needle in a haystack, and the Command Palette was a wall of text that gave me a headache just scanning for basic actions. The user experience just wasn't clicking with my taste.

So I made Noether as a fun project born out of that frustration.

A little backstory: before the current name, the project was originally named **Flint**. It was inspired by Obsidian's rock motif, but built on the true philosophy that flint was *the first spark of fire that butterfly-effected the entire age of human civilization.* That spark represented the small initial notes and thoughts that compound over time into an entire body of work.

Eventually, I rebranded to **Noether** in honor of mathematician Emmy Noether. Her theorem in mathematical physics (linking continuous symmetries directly to conservation laws) is a neat parallel for balancing plain Markdown files on disk with high-speed in-memory indexing, while also sounding undeniably cool and elegant.

## 1. Fast Native Desktop Feel

---

Many modern note-taking apps rely on heavy UI animations: sliding sidebars, bouncy toggles, and fading dialogs. While these look fancy, they add perceptible delay when writing and thinking.

In Noether, micro-interaction animations are removed. Menus open immediately, sidebars toggle instantly, and toggles switch on the exact frame you click them. The interface feels snappy and responsive, like a classic native desktop utility.

## 2. Plain Markdown on Your Drive

---

Noether follows local-first design principles:

- **Standard Markdown Files**: Every note lives as a plain `.md` file in your vault folder. You can open, edit, or back up your notes using VS Code, Obsidian, Vim, Notepad, or terminal commands at any time.
- **No Cloud Lock-in**: Your data belongs to you. There are no mandatory accounts, subscriptions, or proprietary database locks.
- **Fast SQLite Indexing**: While notes stay as clean Markdown on disk, Noether runs an embedded SQLite index in the background to handle search, backlinks, and tags instantly.

## 3. How Vaults Work

---

In Noether, any folder on your computer can be opened as a **Vault**.

When you open a folder in Noether, a hidden `.noether/` directory is created inside it to store local cache and configuration:

```
My-Notes/                       ← Vault Root Directory
├── .noether/                   ← Local workspace cache and configuration
│   ├── noether.sqlite          ← Embedded SQLite search and backlink index
│   ├── settings.json           ← Vault settings
│   └── extensions/             ← Installed extensions
├── Life/                       ← Topic folders
│   ├── Goals.md
│   └── Finances.md
├── Projects/                   ← Project folders
│   └── Redesign.md
└── Index.md
```

### Organizing Your Notes

You can organize your vault however you prefer. A clean approach is using a few top-level topic folders (such as `Life/`, `Projects/`, `Research/`) with focused subfolders inside, keeping the root directory uncluttered.

## 4. Mobile App Roadmap

---

A dedicated **Android** build is planned following the desktop 1.0.0 release.

Because Noether is built with Tauri v2, bringing it to Android allows direct access to local folders on your phone. You will be able to sync your vault with Syncthing, Git, or cloud drives and open your notes on mobile.

An iOS build is not planned in the near term due to Apple's strict filesystem sandboxing and App Store developer requirements.

## 5. Next Steps

---

- Ready to install? Read [[Installation & Setup]].
- Learn the editor tools in [[Live Preview Editor & Markdown]].
- Explore the 15 built-in [[Canvas]], [[Graph View]], and [[Tasks]] extensions.

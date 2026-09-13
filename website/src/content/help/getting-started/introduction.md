# Introduction to Noether

It was one evening on August 25, 2026, when I decided that I needed a single dedicated folder on my own computer to store my life. I wanted a personal knowledge base where my thoughts, notes, and context could live in one local place, so I didn't have to re-explain who I was or what I was doing every single time I talked to an AI.

At first I thought, *“Obsidian is there.”*

> [!QUOTE]
> “Nah, I don't want to use Obsidian. It seems way too complicated and... too intimidating.”

The labyrinth of settings felt overwhelming. Figuring out how community plugins worked felt like looking for a needle in a haystack, and the Command Palette was an unreadable wall of text that gave me a headache just scanning for basic actions. Overall, the user experience just wasn't clicking with my personal taste.

So I made Noether as a fun project born out of that frustration.

A little funny backstory: before the current name, the project was literally named **Flint**. It was a straight copy of Obsidian's rock-and-stone motif, and I even had this overly dramatic, philosophical pitch written up about how flint was *"the first spark of fire that butterfly-effected the entire age of humanity."*

Eventually, I decided to rebrand to **Noether** mostly because it just sounded undeniably cool and elegant, lol. While Emmy Noether's theorem in mathematical physics (linking continuous symmetries directly to conservation laws) is a neat parallel for balancing plain Markdown files on disk with high-speed in-memory indexing, the honest truth is that the name just sounded cool.

## 1. Zero Animations & The Native Desktop Feel
---

One of my biggest pet peeves with modern desktop software is decorative animation. Sliding sidebars, bouncy toggles, and fading dialogs might look flashy in a product video, but when you are actually writing and thinking, they quickly become perceptible frame lag.

I kind of associate animations with bloat. In Noether, I got rid of micro-interaction transitions entirely. Menus open instantly, sidebars snap into position in zero milliseconds, and toggles switch on the exact frame you click them. It makes the entire application feel as lightweight and immediate as a classic native Windows utility.

## 2. Truth
---

If you are thinking about switching over from Obsidian to Noether, let's be completely candid about the current trade-off.

The clear weakness of Noether right now is the extension ecosystem. Obsidian has had years to cultivate thousands of community plugins built by a massive community. Noether is brand new, so the catalog of extensions is naturally smaller.

> [!IMPORTANT]
> **I am actively porting popular Obsidian plugins!**
> I am actively working on rewriting popular Obsidian community plugins as native Noether community extensions. If you are coming over from Obsidian and miss a specific plugin that you cannot live without, please don't hesitate to DM me on Discord: **[@yvliet](https://discord.com/users/1271415962909933680)**. If you don't know how to code TypeScript, tell me what plugin you need and what features you rely on, and I'll see if I can build a native Noether extension for you.

Looking ahead, my dream extension is an insane visual Dataview extension built with visual block coding using Noether's 2D Canvas edge renderer. The goal is to make it dead simple to construct SQL queries visually without writing raw code, effectively bringing Notion and AppFlowy-style relational databases directly into your local Markdown notes.

## 3. Plain Text on Your Own Drive
---

Noether adheres strictly to local-first principles:

- **Plain Markdown Files**: Every note exists as a standard `.md` file in a regular folder on your computer. You can open, edit, index, or grep your notes using VS Code, Obsidian, Vim, Notepad, or terminal commands at any time.
- **Zero Cloud Lock-in**: Your data belongs entirely to you. There are no mandatory accounts, subscriptions, or proprietary binary formats locking your thinking behind a paywall.
- **Fast Local SQLite Index**: While your Markdown files live cleanly on disk, Noether runs a native compiled SQLite engine via Rust to index backlinks, tags, frontmatter, and full-text search (FTS5) in real time.

## 4. The Vault Concept
---

In Noether, individual workspaces or note vaults are called **Vaults**, just like Obsidian.

A Vault is simply any standard folder on your filesystem that you designate as a Noether workspace. When you open a folder in Noether, a hidden `.noether/` directory is created inside it to store your local search indexes and settings:

```
My-Knowledge-Base/             ← Vault Root Directory
├── .noether/                   ← Local Workspace Metadata & Cache
│   ├── noether.sqlite          ← Embedded native SQLite relational & FTS5 engine
│   ├── noether.sqlite-wal      ← SQLite Write-Ahead Log journal
│   ├── settings.json           ← Vault-specific settings
│   └── extensions/             ← Installed extensions
├── Life/                       ← Big topic folder
│   ├── Personal/
│   │   └── Goals.md
│   └── Finances/
├── Projects/                   ← Scoped project folders
│   └── Website Redesign.md
└── Index.md
```

### How I Organize My Own Vault

People often ask how to structure their notes. While i am not asked, it's my website so I can say whatever I want: Personally, I like to split things up with big topic folders (like `Life/`, `Projects/`, `Research/`) and then create smaller, scoped subfolders inside them. It keeps your file tree clean and scannable without drowning in twenty nested sub-directories or just having an insane amount of files at the root like [Kepano](https://github.com/kepano), the CEO of Obsidian, that has a **monolith** of a vault.

## 5. Mobile Release (Android Only)
---

A lot of people ask: *"Will there be a mobile app for Noether?"*

The short answer is: **yes, Android is coming after the 1.0.0 release.**

Calm down guys, I also want to look at my notes on mobile, I'll do it quick. But I want to flesh out the desktop app first before shifting focus to mobile. Desktop is where deep writing, the floating graph, and the extension ecosystem actually take shape, so getting that foundation rock-solid is where all my energy is right now.

Here is how I'm thinking about platforms:
- **Android**: Supported specifically. Once the desktop reaches `1.0.0`, Android is next on the roadmap. Since Noether is built on Tauri v2, getting it onto Android is manageable, and Android lets you access local files directly without jumping through hoops.
- **iOS**: Probably not iOS anytime soon, unless I decide to learn if it's even possible or worth the hassle of Apple's walled-garden filesystem restrictions and developer account fees.

Until the native Android build arrives, you can sync your vault folder to your phone via Syncthing, Git, or cloud sync and open your `.md` files with any plain text reader.

## 6. Next Steps
---

- Ready to download and install? Head over to [[Installation & Setup]].
- Want to learn the editor? Read [[Live Preview Editor & Markdown]].
- Curious about the floating graph? Check out [[Links, Backlinks & Graph]].

# Installation & Setup

Learn how to install Noether on macOS, Windows, and Linux, or compile the application from source.

## 1. System Requirements
---

- **Windows**: Windows 10 or Windows 11 (64-bit or ARM64)
- **macOS**: macOS 11 (Big Sur) or higher (Apple Silicon and Intel)
- **Linux**: Ubuntu 20.04+, Debian 11+, Fedora 36+, Arch Linux, or any distribution with `webkit2gtk-4.1`

## 2. Desktop Installers
---

Official desktop packages will be published when version `1.0.0` reaches stable status:

- **Windows**: Download the `.msi` installer or `.exe` standalone binary.
- **macOS**: Download the `.dmg` package and drag Noether into your Applications folder.
- **Linux**: Download the `.AppImage` (make executable with `chmod +x`) or the `.deb` package.

## 3. Build from Source
---

You can compile and run Noether locally at any time. Choose your operating system below to view build prerequisites:

<details open>
<summary><b>Windows Build Prerequisites</b></summary>

1. **Node.js**: Version 18.0.0 or higher (from [nodejs.org](https://nodejs.org)).
2. **Rust & Cargo**: Install via [rustup.rs](https://rustup.rs).
3. **C++ Build Tools**: Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++").
4. **WebView2**: Built into Windows 10 and 11 by default.

</details>

<details>
<summary><b>macOS Build Prerequisites</b></summary>

1. **Node.js**: Version 18.0.0 or higher (via Homebrew: `brew install node`).
2. **Rust & Cargo**: Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.
3. **Xcode Command Line Tools**: Run `xcode-select --install` in Terminal.

</details>

<details>
<summary><b>Linux Build Prerequisites</b></summary>

Install the required development headers for WebKitGTK and OpenSSL:

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel

# Arch Linux
sudo pacman -S webkit2gtk-4.1 openssl gtk3
```

</details>

### Quickstart Commands

```bash
# 1. Clone the repository
git clone https://github.com/yvliet/Noether.git
cd noether

# 2. Install dependencies
npm install

# 3. Launch the desktop application with live reload
npm run app
```

### Production Desktop Binary

```bash
# Compile native desktop package (.msi / .dmg / .AppImage)
npm run tauri:build
```

The compiled binaries are generated in `src-tauri/target/release/bundle/`.

## 4. First Run & Creating a Vault
---

1. Launch Noether.
2. When prompted, select **Open Folder as Vault** or **Create New Vault** (see [[Vaults & Workspace Storage]]).
3. Choose any folder on your computer.
4. Noether initializes the workspace and opens your note canvas immediately.

> [!TIP]
> You can open existing folders containing `.md` files (such as an existing Obsidian vault or Git repository). Noether reads your Markdown notes without modifying their structure. For codebase and contributor setups, see [[Contributing to Noether]].

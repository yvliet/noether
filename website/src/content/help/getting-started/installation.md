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

You can compile and run Noether locally at any time:

### Prerequisites

1. **Node.js**: Version 18.0.0 or higher.
2. **Rust & Cargo**: Version 1.75 or higher (install via [rustup.rs](https://rustup.rs)).
3. **C++ Build Tools**:
   - On Windows: Visual Studio C++ Build Tools.
   - On Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`.
   - On macOS: Xcode Command Line Tools (`xcode-select --install`).

### Build Steps

```bash
# 1. Clone the repository
git clone https://github.com/yvliet/Noether.git
cd noether

# 2. Install dependencies
npm install

# 3. Launch the desktop application
npm run app
```

### Production Build

```bash
# Compile native desktop binary for your current OS
npm run tauri:build
```

The resulting binary is generated in `src-tauri/target/release/bundle/`.

## 4. First Run & Creating a Vault
---

1. Launch Noether.
2. When prompted, select **Open Folder as Vault** or **Create New Vault**.
3. Choose any folder on your computer.
4. Noether initializes the workspace and opens your new note canvas immediately.

> [!TIP]
> You can open existing folders containing `.md` files (such as an existing Obsidian vault or Git repository). Noether reads your Markdown notes without modifying their structure.

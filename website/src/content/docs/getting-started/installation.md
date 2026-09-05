# Installation & Setup

Flint is distributed as a lightweight, cross-platform native desktop application built with Rust and Tauri. You can install pre-compiled binaries or build directly from source.


## 1. Quick Install via One-Liner

---

You can install Flint instantly from your terminal with a single command:

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.ps1 | iex
```

### macOS & Linux (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.sh | bash
```

---

## 2. Desktop Binaries & Direct Download

---

Pre-compiled standalone binaries and installers are available directly on the [Flint Releases page](https://github.com/yvliet/flint/releases/latest).

### Platform Download Matrix

| Operating System | Package Format | Architecture | Download Link |
| :--- | :--- | :--- | :--- |
| **Windows** | `.msi` (Installer) | x64 | [Flint-Setup-x64.msi](https://github.com/yvliet/flint/releases/latest) |
| **Windows** | `.exe` (Standalone) | x64 | [Flint-x64.exe](https://github.com/yvliet/flint/releases/latest) |
| **macOS** | `.dmg` (Universal) | Apple Silicon & Intel | [Flint.dmg](https://github.com/yvliet/flint/releases/latest) |
| **Linux** | `.AppImage` (Portable) | x86_64 | [Flint.AppImage](https://github.com/yvliet/flint/releases/latest) |
| **Linux** | `.deb` (Debian/Ubuntu) | x86_64 | [flint_amd64.deb](https://github.com/yvliet/flint/releases/latest) |
| **Web Preview** | Browser (WASM SQLite) | Any modern browser | [yvliet.github.io/flint](https://yvliet.github.io/flint/) |

---

### System Requirements

| Operating System | Supported Versions | Architecture |
| :--- | :--- | :--- |
| **macOS** | macOS 12 Monterey or newer | Apple Silicon (M1/M2/M3/M4) & Intel (x64) |
| **Windows** | Windows 10 (1809+) and Windows 11 | x64, ARM64 |
| **Linux** | Ubuntu 22.04+, Fedora 38+, Arch Linux | x64, ARM64 (WebKitGTK 4.1) |

---

### macOS Manual Installation

1. Download the latest `.dmg` release from the [Flint Releases page](https://github.com/yvliet/flint/releases/latest).
2. Open the downloaded `.dmg` disk image.
3. Drag **Flint.app** into your `/Applications` folder.
4. Launch Flint from Spotlight (`Cmd + Space`) or Launchpad.

> [!NOTE]
> On initial launch, macOS Gatekeeper may prompt for confirmation if the binary was downloaded directly via browser. You can permit launch via **System Settings > Privacy & Security > Open Anyway**.

---

### Windows Manual Installation

1. Download the Windows installer (`Flint-Setup-x64.msi` or `.exe`) from the [Releases page](https://github.com/yvliet/flint/releases/latest).
2. Run the installer wizard to install Flint into your user profile (`%LOCALAPPDATA%\Programs\Flint`).
3. Launch Flint via the Start Menu or desktop shortcut.

> [!TIP]
> Flint requires **Microsoft Edge WebView2 Runtime**, which is pre-installed on all Windows 11 and modern Windows 10 installations. If missing, the installer will automatically download the evergreen runtime bootstrapper from Microsoft.

---

### Linux Manual Installation

Flint provides both portable AppImage packages and native Debian packages:

#### AppImage (Universal)
```bash
# Make the AppImage executable
chmod +x Flint.AppImage

# Launch Flint
./Flint.AppImage
```

#### Debian / Ubuntu (`.deb`)
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-0 libssl3 libappindicator3-1
sudo dpkg -i flint_*_amd64.deb
```


## 3. Opening or Creating Your First Hearth

---

When you first launch Flint, the workspace selector greets you:

1. **Create New Hearth**: Select an empty directory on your machine. Flint will initialize the `.flint/` metadata folder and create a starter note.
2. **Open Existing Folder**: Choose any existing directory containing Markdown notes (such as an existing Obsidian vault, Foam directory, or GitHub documentation repo). Flint scans the directory, populates its SQLite index, and renders your note hierarchy without altering your existing files.


## 4. Building From Source

---

Developers wishing to contribute to Flint core or test unreleased features can compile the desktop application from source.

### Prerequisites

1. **Node.js**: Version `20.0.0` or higher (`v22` LTS or `v24` recommended).
2. **Rust & Cargo**: Version `1.78.0` or higher. Install via [rustup.rs](https://rustup.rs/):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. **Platform Build Dependencies**:
   - **Windows**: [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++").
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
   - **Linux (Debian/Ubuntu)**:
     ```bash
     sudo apt install -y build-essential curl wget file libssl-dev libgtk-3-dev \
       libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev
     ```

---

### Step-by-Step Build Instructions

#### Step 1: Clone the Repository
```bash
git clone https://github.com/yvliet/flint.git
cd flint
```

#### Step 2: Install Frontend Dependencies
```bash
npm install
```

#### Step 3: Launch in Development Mode
To run the live development environment with hot module replacement (HMR) for both the React frontend and Tauri Rust backend:
```bash
npm run tauri dev
```
Flint's Vite dev server will start at `http://localhost:1420`, and Tauri will spawn the native desktop window.

#### Step 4: Run Headless Web Preview
To preview the web frontend in your browser without compiling the Rust desktop container:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. Web mode uses the WebAssembly SQLite fallback engine and mock platform adapters.

#### Step 5: Compile Production Binary
To generate an optimized, stripped standalone installer for your current operating system:
```bash
npm run tauri build
```
The resulting installers and standalone binaries will be placed in:
```
src-tauri/target/release/bundle/
```


## 5. Verification & Type Checking

---

Ensure that all TypeScript types and Rust components pass static analysis:

```bash
# Verify TypeScript typing across all core modules
npx tsc --noEmit

# Verify Rust compilation and linting
cd src-tauri && cargo check
```


## 6. Next Steps

---

Once your environment is set up:
- Read [[Introduction to Flint]] to understand the Hearth model and data sovereignty.
- Check [[Dual-Storage Architecture]] to explore disk sync and SQLite caching.
- Build your first custom plugin with [[Plugin Quick Start]].
- Learn how to customize colors with [[Build Your First Theme]] and [[CSS Variables & Design Tokens]].

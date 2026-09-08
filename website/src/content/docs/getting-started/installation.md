# Installation & Setup

Flint is distributed as a lightweight, cross-platform native desktop application built with Rust and Tauri. You can install pre-compiled binaries or build directly from source.


## 1. Availability & Version 1.0.0 Roadmap

---

Official pre-compiled desktop binaries and one-click installers will be available soon once **version 1.0.0** is officially released and reaches stable status.

Until the stable 1.0.0 release is available, you can try Flint directly in your browser or compile and run the native desktop application locally from source:

- **Web Preview**: Experience Flint directly in your browser powered by WebAssembly SQLite: [Launch Web App →](https://yvliet.github.io/flint/)
- **Build from Source**: Clone the repository and compile or run the desktop app locally (see [Building From Source](#3-building-from-source)).

### Upcoming Platform Support for v1.0.0

When version 1.0.0 launches, standalone installers and packages will be released for all major platforms:

- **Windows**: `.msi` Windows Installer and `.exe` standalone packages (x64, ARM64)
- **macOS**: `.dmg` package (Universal binary for Apple Silicon and Intel)
- **Linux**: `.AppImage` portable package and `.deb` Debian/Ubuntu package (x86_64, ARM64)

---

## 2. System Requirements

---

| Operating System | Supported Versions | Architecture |
| :--- | :--- | :--- |
| **macOS** | macOS 12 Monterey or newer | Apple Silicon (M1/M2/M3/M4) & Intel (x64) |
| **Windows** | Windows 10 (1809+) and Windows 11 | x64, ARM64 |
| **Linux** | Ubuntu 22.04+, Fedora 38+, Arch Linux | x64, ARM64 (WebKitGTK 4.1) |

---

## 3. Building From Source

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


## 4. Verification & Type Checking

---

Ensure that all TypeScript types and Rust components pass static analysis:

```bash
# Verify TypeScript typing across all core modules
npx tsc --noEmit

# Verify Rust compilation and linting
cd src-tauri && cargo check
```


## 5. Next Steps

---

Once your environment is set up:
- Read [[Introduction to Flint]] to understand the Hearth model and data sovereignty.
- Check [[Dual-Storage Architecture]] to explore disk sync and SQLite caching.
- Build your first custom extension with [[Extension Quick Start]].
- Learn how to customize colors with [[Build Your First Theme]] and [[CSS Variables & Design Tokens]].

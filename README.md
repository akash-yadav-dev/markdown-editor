# Markdown Editor

A small, fast, offline Markdown editor for Windows. Built with Tauri 2, React, and CodeMirror 6 —
no Electron, no backend, no database, no telemetry, no network access at all.

The whole installer is about 1.6 MB.

## Features

- **Tabs** — open as many files as you like. Each tab keeps its own undo history, cursor, and
  scroll position, so switching between files never loses your place.
- **Four view modes** — editor only, preview only, side-by-side, or stacked, with a draggable
  divider.
- **Live preview** — rendered as you type, debounced so it stays smooth in large documents.
- **Three themes** — light, dark, and sepia.
- **File associations** — double-click a `.md` file, or use "Open with". If the app is already
  running, the file opens in a new tab in the existing window instead of launching a second copy.
- **Session restore** — reopens saved files and recovers local unsaved drafts.
- **Unsaved-change guards** — closing a tab or the window prompts before discarding edits.
- **Preview windows** — run `markdown-editor --preview path\to\file.md` to open a live, read-only preview in a separate window.

Everything happens on your machine. The app makes no network requests, and raw HTML embedded in a
Markdown document is never rendered (`markdown-it` runs with `html: false`), so opening an
untrusted file can't execute anything.

## Install

Download the latest `Markdown Editor_x.y.z_x64-setup.exe` from the
[Releases](../../releases) page and run it.

It installs per-user into `%LOCALAPPDATA%\Markdown Editor` — no administrator rights required. To
upgrade, just run the newer installer; it replaces the previous version automatically. To remove
it, use *Add or remove programs*, or run `uninstall.exe` from the install folder.

Windows 11 already includes the WebView2 runtime the app needs. On Windows 10 it is usually
present too; if not, the installer will prompt for it.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+O` | Open a file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+N` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+1` … `Ctrl+9` | Jump to tab by position |
| `Ctrl+F` | Find |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |

From a terminal, pass a Markdown path to open it in the editor. Add `--preview` to open a separate
read-only preview window that refreshes as the file changes. Paths may be absolute or relative to
the terminal's current folder, for example `markdown-editor --preview README.md`.

Middle-clicking a tab closes it.

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [Rust](https://rustup.rs/), `stable-x86_64-pc-windows-msvc` toolchain
- **Visual Studio Build Tools** with the *Desktop development with C++* workload, **including the
  Windows 10/11 SDK component**

That last point is the one that trips people up. The MSVC compiler alone is not enough — the
Windows SDK is what supplies `kernel32.lib`, `OleAut32.lib`, and `rc.exe`. Without it, linking
fails with `LNK1181: cannot open input file 'OleAut32.lib'` or
`linker 'link.exe' not found`.

```powershell
winget install --id Microsoft.VisualStudio.BuildTools -e --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### Run and build

```bash
npm install
npm run tauri dev     # development, with hot reload
npm run tauri build   # release build
```

The release build writes an NSIS installer to
`src-tauri/target/release/bundle/nsis/`.

> **Note for Git Bash / MSYS2 users:** build from PowerShell or `cmd`, not Git Bash. Git ships a
> coreutils `link.exe` in its `usr/bin` that shadows the MSVC linker on `PATH`, and the build fails
> with the cryptic `link: missing operand`.

## Project layout

```
src/                     React app, no OS-specific code
  components/            TopBar, TabBar, SplitPane
  editor/                CodeMirror wrapper, Markdown language, themes
  preview/               markdown-it renderer
  services/              thin wrappers over Tauri commands and events
  types/                 shared TypeScript types
  utils/                 small pure helpers

src-tauri/src/
  file_service.rs        file I/O and native dialogs (rfd)
  commands.rs            #[tauri::command] wrappers over file_service
  lib.rs                 app wiring: plugins, single-instance, startup file argument
```

The React side never calls OS APIs directly — it goes through `src/services/*`, which invoke Tauri
commands. Porting to Linux or macOS would mean touching `src-tauri` and that services layer only;
the file I/O and dialogs in `file_service.rs` are already cross-platform.

### Design notes

- The editor uses a hand-assembled GFM language definition
  (`src/editor/markdownLanguage.ts`) rather than `@codemirror/lang-markdown`, which would drag in
  transitive HTML/CSS/JavaScript language support the app has no use for.
- `editorSetup` is a trimmed replacement for CodeMirror's `basicSetup` with the autocomplete and
  lint subsystems removed — neither applies to prose.
- The preview renderer is lazy-loaded on the first switch to a preview mode, keeping it out of the
  initial bundle.
- All open tabs share one `EditorView`; each document is a separate `EditorState` swapped in on
  tab switch. That is what preserves undo history per tab without paying for one editor instance
  per open file.

### A note on MSIX

Tauri's bundler targets `msi` (WiX) and `nsis`; there is no first-party MSIX target. This project
ships NSIS — it is lighter, handles file associations well, and installs per-user without
elevation. If you need MSIX, wrap the built installer with the
[MSIX Packaging Tool](https://learn.microsoft.com/windows/msix/packaging-tool/tool-overview) as a
separate step.

## License

MIT — see [LICENSE](LICENSE).

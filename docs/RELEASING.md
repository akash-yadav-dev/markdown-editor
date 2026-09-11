# Windows release procedure

This project builds a lightweight NSIS installer with the existing local
toolchain. The release script reuses cached SDK files and never downloads tools
automatically.

## One-time machine setup

The machine needs Node.js, Rust, Tauri CLI dependencies, and Visual Studio C++
build tools. Confirm these files exist:

```text
C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.50.35717\bin\Hostx64\x64\cl.exe
C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.50.35717\bin\Hostx64\x64\link.exe
```

The local xwin CRT/SDK cache belongs in `.xwin`, and Windows SDK BuildTools'
`rc.exe` belongs in `.xwin-tool\sdk-buildtools\bin\10.0.26100.0\x64`.
These directories are intentionally ignored by Git. If a new machine needs
them, recreate them once with the same xwin and NuGet steps used previously;
normal releases should not repeat that download.

## Release build

From the repository root, run:

```bat
npm run build
scripts\build-installer.cmd
```

The script validates `cl.exe`, `link.exe`, `rc.exe`, and the cached CRT before
calling `npx tauri build`. The installer is written to:

```text
src-tauri\target\release\bundle\nsis\Markdown Editor_<version>_x64-setup.exe
```

The version comes from `package.json`/`src-tauri/tauri.conf.json`; update all
three package manifests together before a release.

## Verification and publishing

1. Run `npm run build` and confirm it succeeds.
2. Run `scripts\build-installer.cmd` and confirm the NSIS file exists.
3. Launch the generated `src-tauri\target\release\markdown-editor.exe` and
   smoke-test opening a Markdown file, preview, undo/redo, and draft restore.
4. Commit source and documentation (never the ignored SDK caches), then push:
   `git push origin main`.

## Troubleshooting

- `link.exe not found`: install/repair the Visual Studio C++ workload or set
  `MSVCBIN` in the script to the installed version.
- `rc.exe not found`: restore the local SDK BuildTools cache at the path above.
- Missing xwin CRT/SDK: recreate `.xwin` from the cached xwin archive; do not
  add it to Git.
- A capability error mentioning `core:webview:allow-create-webview-window`
  means the Tauri capability file is stale; use the permission name currently
  present in `src-tauri/capabilities/default.json`.

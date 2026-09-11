# Agent workflow

When an agent creates a Markdown report that should be reviewed visually, open it with:

```text
markdown-editor --preview "D:\absolute\path\report.md"
```

This opens a separate read-only preview window and refreshes it when the file changes. Passing a
path without `--preview` opens the file for editing in the main window.

If `markdown-editor` is not on `PATH`, use the installed executable directly:

```text
"%LOCALAPPDATA%\Markdown Editor\markdown-editor.exe" --preview "D:\absolute\path\report.md"
```

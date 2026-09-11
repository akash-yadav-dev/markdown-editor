import { Code2, Columns2, Eye, FolderOpen, Palette, Redo2, Rows2, Save, Undo2 } from "lucide-react";

import type { ThemeName, ViewMode } from "../types";
import "./TopBar.css";

interface TopBarProps {
  viewMode: ViewMode;
  theme: ThemeName;
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onThemeChange: (theme: ThemeName) => void;
}

const THEME_OPTIONS: ThemeName[] = ["light", "dark", "sepia"];

const VIEW_MODE_OPTIONS: { mode: ViewMode; label: string; icon: typeof Code2 }[] = [
  { mode: "code", label: "Code", icon: Code2 },
  { mode: "split-side-by-side", label: "Side by side", icon: Columns2 },
  { mode: "split-stacked", label: "Stacked", icon: Rows2 },
  { mode: "preview", label: "Preview", icon: Eye },
];

export function TopBar({
  viewMode,
  theme,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onViewModeChange,
  onThemeChange,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="app-name">Markdown Editor</span>
      </div>
      <div className="top-bar-actions">
        <button type="button" className="toolbar-button" onClick={onOpen} title="Open (Ctrl+O)">
          <FolderOpen size={16} strokeWidth={2} aria-hidden="true" />
          <span>Open</span>
        </button>
        <button type="button" className="toolbar-button" onClick={onSave} title="Save (Ctrl+S)">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          <span>Save</span>
        </button>
        <button type="button" className="toolbar-button toolbar-icon-button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" className="toolbar-button toolbar-icon-button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo">
          <Redo2 size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="view-mode-group" role="group" aria-label="View mode">
          {VIEW_MODE_OPTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              className={`view-mode-button${viewMode === mode ? " active" : ""}`}
              onClick={() => onViewModeChange(mode)}
              title={label}
              aria-pressed={viewMode === mode}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
        <label className="theme-select">
          <Palette size={16} strokeWidth={2} aria-hidden="true" />
          <select
            aria-label="Editor theme"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemeName)}
          >
            {THEME_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name[0].toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

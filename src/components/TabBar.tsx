import { Plus, X } from "lucide-react";

import { getFileName } from "../utils/path";
import type { Tab } from "../types";
import "./TabBar.css";

interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function TabBar({ tabs, activeId, onSelect, onClose, onNew }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Open documents">
      <div className="tab-strip">
        {tabs.map((tab) => {
          const name = tab.path ? getFileName(tab.path) : tab.untitledName ?? "Untitled 1.md";
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={`tab${isActive ? " active" : ""}`}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              title={tab.path ?? name}
              onMouseDown={(event) => {
                // Middle-click closes, matching the convention in browsers and code editors.
                if (event.button === 1) {
                  event.preventDefault();
                  onClose(tab.id);
                } else if (event.button === 0) {
                  onSelect(tab.id);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(tab.id);
                }
              }}
            >
              {tab.isDirty && <span className="dirty-dot" aria-hidden="true" />}
              <span className="tab-name">{name}</span>
              <button
                type="button"
                className="tab-close"
                aria-label={`Close ${name}`}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
              >
                <X size={12} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="tab-new" onClick={onNew} title="New tab (Ctrl+N)" aria-label="New tab">
        <Plus size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

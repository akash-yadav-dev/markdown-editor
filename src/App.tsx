import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

import { SplitPane } from "./components/SplitPane";
import { TabBar } from "./components/TabBar";
import { TopBar } from "./components/TopBar";
import { Editor, type EditorHandle } from "./editor/Editor";
import { confirmDiscard, showError } from "./services/dialogService";
import {
  getStartupFile,
  onFileOpenRequested,
  onPreviewRequested,
  openFileDialog,
  readFileAtPath,
  saveFile,
  saveFileAs,
} from "./services/fileService";
import { onCloseRequested, openPreviewWindow, setWindowTitle } from "./services/windowService";
import { getFileName } from "./utils/path";
import type { Tab, ThemeName, ViewMode } from "./types";
import "./App.css";

// markdown-it and the preview renderer are not needed until the user first
// shows a preview pane, so they load as a separate chunk on demand.
const Preview = lazy(() => import("./preview/Preview").then((m) => ({ default: m.Preview })));

const THEME_STORAGE_KEY = "markdown-editor.theme";
const VIEW_MODE_STORAGE_KEY = "markdown-editor.viewMode";
const SPLIT_RATIO_STORAGE_KEY = "markdown-editor.splitRatio";
const SESSION_STORAGE_KEY = "markdown-editor.session";
const LEGACY_LAST_FILE_KEY = "markdown-editor.lastFile";

const VIEW_MODES: ViewMode[] = ["code", "preview", "split-side-by-side", "split-stacked"];

const UNTITLED_FALLBACK = "Untitled 1.md";

interface StoredSession {
  paths?: string[];
  entries?: StoredEntry[];
  activeIndex: number;
}

interface StoredEntry {
  path: string | null;
  untitledName: string | null;
  content?: string;
  isDirty?: boolean;
}

function loadStoredTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "sepia" || stored === "light" ? stored : "light";
}

function loadStoredViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return (VIEW_MODES as string[]).includes(stored ?? "") ? (stored as ViewMode) : "code";
}

function loadStoredSplitRatio(): number {
  const stored = Number(localStorage.getItem(SPLIT_RATIO_STORAGE_KEY));
  return stored > 0 && stored < 1 ? stored : 0.5;
}

function loadStoredSession(): StoredSession {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      const paths = Array.isArray(parsed.paths)
        ? parsed.paths.filter((path): path is string => typeof path === "string")
        : [];
      return {
        paths,
        entries: Array.isArray(parsed.entries) ? parsed.entries as StoredEntry[] : undefined,
        activeIndex: typeof parsed.activeIndex === "number" ? parsed.activeIndex : 0,
      };
    } catch {
      // Corrupt session; fall through to the pre-tabs single-file key.
    }
  }
  const legacy = localStorage.getItem(LEGACY_LAST_FILE_KEY);
  return { paths: legacy ? [legacy] : [], activeIndex: 0 };
}

function showsPreview(mode: ViewMode): boolean {
  return mode !== "code";
}

function tabLabel(tab: Tab): string {
  return tab.path ? getFileName(tab.path) : tab.untitledName ?? UNTITLED_FALLBACK;
}

let tabSequence = 0;
let untitledSequence = 0;
function createTab(path: string | null, untitledName?: string | null): Tab {
  tabSequence += 1;
  if (path === null && !untitledName) {
    untitledSequence += 1;
    untitledName = `Untitled ${untitledSequence}.md`;
  }
  return { id: `tab-${tabSequence}`, path, untitledName: path ? null : untitledName ?? UNTITLED_FALLBACK, isDirty: false };
}

export default function App() {
  const previewPath = new URLSearchParams(window.location.search).get("previewPath");
  if (previewPath) return <PreviewWindow path={previewPath} />;
  return <EditorApp />;
}

function PreviewWindow({ path }: { path: string }) {
  const [theme] = useState<ThemeName>(loadStoredTheme);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setContent(await readFileAtPath(path));
      setError(null);
    } catch (nextError) {
      setError(String(nextError));
    }
  }, [path]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 750);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    void setWindowTitle(`${getFileName(path)} — Markdown Preview`);
  }, [path]);

  return (
    <div className="preview-window">
      <header className="preview-window-bar">
        <span className="preview-window-title">{getFileName(path)}</span>
        <button type="button" className="toolbar-button" onClick={() => void refresh()} title="Refresh preview">
          Refresh
        </button>
      </header>
      {error ? <div className="preview-window-error">Could not read this file. {error}</div> : content !== null ? <Suspense fallback={<div className="preview-window-loading">Loading preview…</div>}><Preview content={content} basePath={path} /></Suspense> : <div className="preview-window-loading">Loading preview…</div>}
    </div>
  );
}

function EditorApp() {
  const [theme, setTheme] = useState<ThemeName>(loadStoredTheme);
  const [viewMode, setViewMode] = useState<ViewMode>(loadStoredViewMode);
  const [splitRatio, setSplitRatio] = useState<number>(loadStoredSplitRatio);
  const [firstTab] = useState(() => createTab(null));
  const [tabs, setTabs] = useState<Tab[]>(() => [firstTab]);
  const [activeId, setActiveId] = useState(firstTab.id);
  const [previewSource, setPreviewSource] = useState("");
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [sessionRevision, setSessionRevision] = useState(0);
  const sessionReadyRef = useRef(false);

  const editorRef = useRef<EditorHandle>(null);
  // Text for tabs the editor has not built a document for yet. A tab opened in the
  // background has nowhere else to keep its content until it is first shown.
  const contentSeedRef = useRef(new Map<string, string>());

  // Everything downstream keys off the resolved tab rather than `activeId`, so a
  // render where the id has not caught up with the list can never point the editor
  // at a document that no longer exists.
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeIdRef = useRef(activeTab.id);
  activeIdRef.current = activeTab.id;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(splitRatio));
  }, [splitRatio]);

  useEffect(() => {
    void setWindowTitle(`${activeTab.isDirty ? "● " : ""}${tabLabel(activeTab)} — Markdown Editor`);
  }, [activeTab]);

  useEffect(() => {
    if (!sessionReadyRef.current) return;
    const entries: StoredEntry[] = tabs.map((tab) => ({
      path: tab.path,
      untitledName: tab.untitledName,
      content: tab.path === null ? editorRef.current?.getContent(tab.id) ?? contentSeedRef.current.get(tab.id) ?? "" : undefined,
      isDirty: tab.isDirty,
    }));
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ entries, activeIndex: Math.max(tabs.findIndex((tab) => tab.id === activeTab.id), 0) } satisfies StoredSession),
      );
    } catch {
      // A very large draft should never prevent the editor from working.
    }
  }, [tabs, activeTab, sessionRevision]);

  /** Shows `path` in a tab: focusing the one that already has it, or opening a new one. */
  const openPath = useCallback((path: string, content: string) => {
    const current = tabsRef.current;
    const existing = current.find((tab) => tab.path === path);
    if (existing) {
      setActiveId(existing.id);
      return;
    }

    const opened = createTab(path);
    contentSeedRef.current.set(opened.id, content);

    // An untouched Untitled tab is a placeholder, not a document worth keeping
    // around next to the file the user just asked for.
    const active = current.find((tab) => tab.id === activeIdRef.current);
    if (active && active.path === null && !active.isDirty) {
      editorRef.current?.releaseDoc(active.id);
      contentSeedRef.current.delete(active.id);
      setTabs(current.map((tab) => (tab.id === active.id ? opened : tab)));
    } else {
      setTabs([...current, opened]);
    }
    setActiveId(opened.id);
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const opened = await openFileDialog();
      if (opened) openPath(opened.path, opened.content);
    } catch (error) {
      void showError(`Could not open file.\n${String(error)}`);
    }
  }, [openPath]);

  const handleNewTab = useCallback(() => {
    const created = createTab(null);
    contentSeedRef.current.set(created.id, "");
    setTabs([...tabsRef.current, created]);
    setActiveId(created.id);
  }, []);

  const saveTab = useCallback(async (id: string, forceDialog = false): Promise<boolean> => {
    const tab = tabsRef.current.find((candidate) => candidate.id === id);
    if (!tab) return false;
    const content = editorRef.current?.getContent(id) ?? "";
    try {
      if (tab.path && !forceDialog) {
        await saveFile(tab.path, content);
        editorRef.current?.markClean(id);
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, isDirty: false } : t)));
        return true;
      }
      const newPath = await saveFileAs(content, tabLabel(tab));
      if (!newPath) return false;
      editorRef.current?.markClean(id);
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, path: newPath, isDirty: false } : t)));
      return true;
    } catch (error) {
      void showError(`Could not save file.\n${String(error)}`);
      return false;
    }
  }, []);

  const closeTab = useCallback(async (id: string) => {
    const tab = tabsRef.current.find((candidate) => candidate.id === id);
    if (!tab) return;
    if (
      tab.isDirty &&
      !(await confirmDiscard(`"${tabLabel(tab)}" has unsaved changes. Close without saving?`))
    ) {
      return;
    }

    editorRef.current?.releaseDoc(id);
    contentSeedRef.current.delete(id);

    // Re-read: the confirmation above gave other handlers a chance to change the list.
    const current = tabsRef.current;
    const index = current.findIndex((candidate) => candidate.id === id);
    if (index < 0) return;
    const remaining = current.filter((candidate) => candidate.id !== id);

    if (remaining.length === 0) {
      const replacement = createTab(null);
      contentSeedRef.current.set(replacement.id, "");
      setTabs([replacement]);
      setActiveId(replacement.id);
      return;
    }

    setTabs(remaining);
    if (id === activeIdRef.current) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
    }
  }, []);

  const handleViewModeChange = useCallback((next: ViewMode) => {
    if (showsPreview(next)) setPreviewSource(editorRef.current?.getContent() ?? "");
    setViewMode(next);
  }, []);

  const handleDirty = useCallback((id: string) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id && !tab.isDirty ? { ...tab, isDirty: true } : tab)));
    setSessionRevision((revision) => revision + 1);
  }, []);

  const handleHistoryChange = useCallback((id: string, canUndo: boolean, canRedo: boolean) => {
    if (id === activeIdRef.current) setHistory({ canUndo, canRedo });
  }, []);

  const handleContentChange = useCallback((id: string, content: string) => {
    if (id === activeIdRef.current && showsPreview(viewModeRef.current)) setPreviewSource(content);
    if (tabsRef.current.find((tab) => tab.id === id)?.path === null) {
      contentSeedRef.current.set(id, content);
      setSessionRevision((revision) => revision + 1);
    }
  }, []);

  // The editor swaps documents in its own effect, which runs before this one.
  useEffect(() => {
    if (showsPreview(viewModeRef.current)) {
      setPreviewSource(editorRef.current?.getContent(activeTab.id) ?? "");
    }
  }, [activeTab.id]);

  // Reopen last session's files, plus whatever Windows passed on the command line
  // (double-click / "Open with").
  useEffect(() => {
    void (async () => {
      const session = loadStoredSession();
      const restored: { tab: Tab; content: string }[] = [];
      const entries: StoredEntry[] = session.entries ?? (session.paths ?? []).map((path) => ({ path, untitledName: null }));
      for (const entry of entries) {
        const path = entry.path;
        try {
          if (path) {
            restored.push({ tab: createTab(path), content: await readFileAtPath(path) });
          } else if (typeof entry.content === "string") {
            const tab = createTab(null, entry.untitledName);
            tab.isDirty = entry.isDirty ?? true;
            restored.push({ tab, content: entry.content });
          }
        } catch {
          // File moved or deleted since last run; drop it silently.
        }
      }
      let activeIndex = Math.min(Math.max(session.activeIndex, 0), Math.max(restored.length - 1, 0));

      const startup = await getStartupFile();
      if (startup) {
        if (startup.preview) {
          openPreviewWindow(startup.path);
          return;
        }
        const alreadyOpen = restored.findIndex((entry) => entry.tab.path === startup.path);
        if (alreadyOpen >= 0) {
          restored[alreadyOpen].content = startup.content;
          activeIndex = alreadyOpen;
        } else {
          restored.push({ tab: createTab(startup.path), content: startup.content });
          activeIndex = restored.length - 1;
        }
      }

      if (restored.length === 0) {
        sessionReadyRef.current = true;
        return;
      }

      for (const entry of restored) contentSeedRef.current.set(entry.tab.id, entry.content);
      editorRef.current?.releaseDoc(firstTab.id);
      contentSeedRef.current.delete(firstTab.id);
      setTabs(restored.map((entry) => entry.tab));
      setActiveId(restored[activeIndex].tab.id);
      sessionReadyRef.current = true;
    })();
  }, [firstTab.id]);

  // A second "Open with" launch while the app is already running is forwarded here.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onFileOpenRequested((path) => {
      void (async () => {
        try {
          const content = await readFileAtPath(path);
          openPath(path, content);
        } catch (error) {
          void showError(`Could not open file.\n${String(error)}`);
        }
      })();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [openPath]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onPreviewRequested((path) => openPreviewWindow(path)).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onCloseRequested(
      () => tabsRef.current.some((tab) => tab.isDirty),
      () => {
        const names = tabsRef.current.filter((tab) => tab.isDirty).map(tabLabel);
        return confirmDiscard(
          names.length === 1
            ? `"${names[0]}" has unsaved changes. Close without saving?`
            : `${names.length} files have unsaved changes (${names.join(", ")}). Close without saving?`,
        );
      },
    ).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void saveTab(activeIdRef.current, event.shiftKey);
      } else if (key === "o") {
        event.preventDefault();
        void handleOpen();
      } else if (key === "n") {
        event.preventDefault();
        handleNewTab();
      } else if (key === "w") {
        event.preventDefault();
        void closeTab(activeIdRef.current);
      } else if (key === "tab") {
        event.preventDefault();
        const list = tabsRef.current;
        const index = list.findIndex((tab) => tab.id === activeIdRef.current);
        const step = event.shiftKey ? -1 : 1;
        setActiveId(list[(index + step + list.length) % list.length].id);
      } else if (key >= "1" && key <= "9") {
        const index = Number(key) - 1;
        const list = tabsRef.current;
        if (index < list.length) {
          event.preventDefault();
          setActiveId(list[index].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveTab, handleOpen, handleNewTab, closeTab]);

  const hasShownPreviewRef = useRef(showsPreview(viewMode));
  if (showsPreview(viewMode)) hasShownPreviewRef.current = true;

  return (
    <div className="app-shell">
      <TopBar
        viewMode={viewMode}
        theme={theme}
        onOpen={() => void handleOpen()}
        onSave={() => void saveTab(activeIdRef.current)}
        onUndo={() => editorRef.current?.undo()}
        onRedo={() => editorRef.current?.redo()}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onViewModeChange={handleViewModeChange}
        onThemeChange={setTheme}
      />
      <TabBar
        tabs={tabs}
        activeId={activeTab.id}
        onSelect={setActiveId}
        onClose={(id) => void closeTab(id)}
        onNew={handleNewTab}
      />
      <main className="main-area">
        <SplitPane
          mode={viewMode}
          ratio={splitRatio}
          onRatioChange={setSplitRatio}
          first={
            <Editor
              ref={editorRef}
              docId={activeTab.id}
              initialContent={contentSeedRef.current.get(activeTab.id) ?? ""}
              theme={theme}
              onDirty={handleDirty}
              onHistoryChange={handleHistoryChange}
              onChangeContent={handleContentChange}
            />
          }
          second={
            hasShownPreviewRef.current ? (
              <Suspense fallback={null}>
                <Preview content={previewSource} basePath={activeTab.path ?? undefined} />
              </Suspense>
            ) : undefined
          }
        />
      </main>
    </div>
  );
}

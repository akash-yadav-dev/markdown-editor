import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { markdown } from "./markdownLanguage";
import { editorSetup } from "./setup";
import { getEditorTheme } from "./themes";
import type { ThemeName } from "../types";
import "./editor.css";

export interface EditorHandle {
  /** Content of `docId`, or of the visible document when omitted. */
  getContent: (docId?: string) => string;
  markClean: (docId: string) => void;
  focus: () => void;
  /** Drops the retained state for a closed tab. */
  releaseDoc: (docId: string) => void;
}

interface EditorProps {
  /** Identifies the tab on screen. Changing it swaps documents in place. */
  docId: string;
  /** Seeds the document the first time `docId` is shown; ignored on later switches. */
  initialContent: string;
  theme: ThemeName;
  onDirty: (docId: string) => void;
  /** Debounced (~200ms) full-document text, for panes that show a live preview. */
  onChangeContent?: (docId: string, content: string) => void;
}

interface OpenDoc {
  state: EditorState;
  scrollTop: number;
}

const LIVE_PREVIEW_DEBOUNCE_MS = 200;

const themeCompartment = new Compartment();

/**
 * A single CodeMirror view backs every tab. Each document keeps its own EditorState,
 * which carries undo history and selection with it, so switching tabs restores a
 * document exactly as it was left rather than rebuilding it from text.
 */
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { docId, initialContent, theme, onDirty, onChangeContent },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const docsRef = useRef(new Map<string, OpenDoc>());
  const dirtyRef = useRef(new Set<string>());
  const activeDocRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const onChangeContentRef = useRef(onChangeContent);
  onChangeContentRef.current = onChangeContent;

  const createStateRef = useRef((id: string, content: string) =>
    EditorState.create({
      doc: content,
      extensions: [
        editorSetup,
        markdown(),
        themeCompartment.of(getEditorTheme(themeRef.current)),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          if (!dirtyRef.current.has(id)) {
            dirtyRef.current.add(id);
            onDirtyRef.current(id);
          }
          if (onChangeContentRef.current) {
            clearTimeout(debounceRef.current);
            const doc = update.state.doc;
            debounceRef.current = setTimeout(() => {
              onChangeContentRef.current?.(id, doc.toString());
            }, LIVE_PREVIEW_DEBOUNCE_MS);
          }
        }),
      ],
    }),
  );

  useImperativeHandle(
    ref,
    () => ({
      getContent: (id?: string) => {
        const view = viewRef.current;
        if (!id || id === activeDocRef.current) return view?.state.doc.toString() ?? "";
        return docsRef.current.get(id)?.state.doc.toString() ?? "";
      },
      markClean: (id: string) => {
        dirtyRef.current.delete(id);
      },
      focus: () => viewRef.current?.focus(),
      releaseDoc: (id: string) => {
        docsRef.current.delete(id);
        dirtyRef.current.delete(id);
      },
    }),
    [],
  );

  // The view itself is created once and outlives every tab.
  useEffect(() => {
    if (!hostRef.current) return;

    const id = docId;
    const state = createStateRef.current(id, initialContentRef.current);
    docsRef.current.set(id, { state, scrollTop: 0 });
    activeDocRef.current = id;

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    const docs = docsRef.current;
    const dirty = dirtyRef.current;
    return () => {
      clearTimeout(debounceRef.current);
      view.destroy();
      viewRef.current = null;
      activeDocRef.current = null;
      docs.clear();
      dirty.clear();
    };
    // Deliberately mount-only: tab switches are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const previous = activeDocRef.current;
    if (previous === docId) return;

    if (previous !== null) {
      const outgoing = docsRef.current.get(previous);
      if (outgoing) {
        outgoing.state = view.state;
        outgoing.scrollTop = view.scrollDOM.scrollTop;
      }
    }

    // A pending preview update belongs to the tab being left behind.
    clearTimeout(debounceRef.current);

    let incoming = docsRef.current.get(docId);
    if (!incoming) {
      incoming = { state: createStateRef.current(docId, initialContentRef.current), scrollTop: 0 };
      docsRef.current.set(docId, incoming);
    }

    view.setState(incoming.state);
    // The incoming state carries whatever theme it was created under, so re-apply
    // the current one rather than trusting what the compartment already holds.
    view.dispatch({ effects: themeCompartment.reconfigure(getEditorTheme(themeRef.current)) });
    view.scrollDOM.scrollTop = incoming.scrollTop;
    activeDocRef.current = docId;
    view.focus();
  }, [docId]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure(getEditorTheme(theme)),
    });
  }, [theme]);

  return <div className="editor-host" ref={hostRef} />;
});

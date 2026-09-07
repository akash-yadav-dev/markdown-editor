import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

import type { ThemeName } from "../types";

function buildTheme(colors: {
  background: string;
  foreground: string;
  gutterBackground: string;
  gutterForeground: string;
  activeLine: string;
  selection: string;
  cursor: string;
  dark: boolean;
}): Extension {
  return EditorView.theme(
    {
      "&": {
        color: colors.foreground,
        backgroundColor: colors.background,
        height: "100%",
        fontSize: "14px",
      },
      ".cm-content": {
        caretColor: colors.cursor,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        padding: "16px 0",
      },
      ".cm-scroller": { overflow: "auto" },
      "&.cm-focused .cm-cursor": { borderLeftColor: colors.cursor },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: `${colors.selection} !important`,
      },
      ".cm-gutters": {
        backgroundColor: colors.gutterBackground,
        color: colors.gutterForeground,
        border: "none",
      },
      ".cm-activeLine": { backgroundColor: colors.activeLine },
      ".cm-activeLineGutter": { backgroundColor: colors.activeLine },
    },
    { dark: colors.dark },
  );
}

const lightTheme = buildTheme({
  background: "#ffffff",
  foreground: "#1f2430",
  gutterBackground: "#ffffff",
  gutterForeground: "#a0a8b4",
  activeLine: "#f4f6f8",
  selection: "#cfe2ff",
  cursor: "#1f2430",
  dark: false,
});

const darkTheme = buildTheme({
  background: "#1a1d23",
  foreground: "#e3e5e8",
  gutterBackground: "#1a1d23",
  gutterForeground: "#565c66",
  activeLine: "#22262d",
  selection: "#3a4b6b",
  cursor: "#e3e5e8",
  dark: true,
});

const sepiaTheme = buildTheme({
  background: "#f4ecd8",
  foreground: "#5b4636",
  gutterBackground: "#f4ecd8",
  gutterForeground: "#b6a689",
  activeLine: "#ece0c4",
  selection: "#dfceac",
  cursor: "#5b4636",
  dark: false,
});

function buildHighlight(colors: {
  heading: string;
  strong: string;
  emphasis: string;
  link: string;
  code: string;
  quote: string;
  comment: string;
  list: string;
}): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.heading, color: colors.heading, fontWeight: "700" },
      { tag: t.strong, color: colors.strong, fontWeight: "700" },
      { tag: t.emphasis, fontStyle: "italic" },
      { tag: [t.link, t.url], color: colors.link, textDecoration: "underline" },
      { tag: t.monospace, color: colors.code, fontFamily: "monospace" },
      { tag: t.quote, color: colors.quote, fontStyle: "italic" },
      { tag: t.list, color: colors.list },
      { tag: t.comment, color: colors.comment },
    ]),
  );
}

const lightHighlight = buildHighlight({
  heading: "#1a56db",
  strong: "#1f2430",
  emphasis: "#1f2430",
  link: "#2563eb",
  code: "#b45309",
  quote: "#6b7280",
  comment: "#9ca3af",
  list: "#7c3aed",
});

const darkHighlight = buildHighlight({
  heading: "#7aa2f7",
  strong: "#e3e5e8",
  emphasis: "#e3e5e8",
  link: "#7dcfff",
  code: "#e0af68",
  quote: "#8b93a7",
  comment: "#565c66",
  list: "#bb9af7",
});

const sepiaHighlight = buildHighlight({
  heading: "#8a5a2f",
  strong: "#5b4636",
  emphasis: "#5b4636",
  link: "#9c5a1d",
  code: "#8a5a2f",
  quote: "#8a7761",
  comment: "#b6a689",
  list: "#a1663f",
});

const THEMES: Record<ThemeName, Extension[]> = {
  light: [lightTheme, lightHighlight],
  dark: [darkTheme, darkHighlight],
  sepia: [sepiaTheme, sepiaHighlight],
};

export function getEditorTheme(name: ThemeName): Extension[] {
  return THEMES[name];
}

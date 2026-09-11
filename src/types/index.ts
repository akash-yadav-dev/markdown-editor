export type ViewMode = "code" | "preview" | "split-side-by-side" | "split-stacked";

export type ThemeName = "light" | "dark" | "sepia";

export interface OpenedFile {
  path: string;
  content: string;
  preview: boolean;
}

/** One open document. `path` is null until an untitled tab is saved somewhere. */
export interface Tab {
  id: string;
  path: string | null;
  untitledName: string | null;
  isDirty: boolean;
}

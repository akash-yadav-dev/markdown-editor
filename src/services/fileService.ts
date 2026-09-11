import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { OpenedFile } from "../types";

export function getStartupFile(): Promise<OpenedFile | null> {
  return invoke<OpenedFile | null>("get_startup_file");
}

export function readFileAtPath(path: string): Promise<string> {
  return invoke<string>("read_file_at_path", { path });
}

export function openFileDialog(): Promise<OpenedFile | null> {
  return invoke<OpenedFile | null>("open_file_dialog");
}

export function saveFile(path: string, content: string): Promise<void> {
  return invoke("save_file", { path, content });
}

export function saveFileAs(content: string, defaultName?: string): Promise<string | null> {
  return invoke<string | null>("save_file_as", { content, defaultName });
}

/** Fires when a .md file is opened via Windows "Open with" while the app is already running. */
export function onFileOpenRequested(handler: (path: string) => void): Promise<UnlistenFn> {
  return listen<string>("open-file", (event) => handler(event.payload));
}

export function onPreviewRequested(handler: (path: string) => void): Promise<UnlistenFn> {
  return listen<string>("open-preview", (event) => handler(event.payload));
}

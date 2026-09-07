import { ask, message } from "@tauri-apps/plugin-dialog";

export function confirmDiscard(prompt: string): Promise<boolean> {
  return ask(prompt, { title: "Unsaved changes", kind: "warning" });
}

export function showError(prompt: string): Promise<void> {
  return message(prompt, { title: "Markdown Editor", kind: "error" }).then(() => undefined);
}

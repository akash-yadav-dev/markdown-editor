import { openUrl } from "@tauri-apps/plugin-opener";

/** Opens http(s) links from rendered Markdown in the system's default browser. */
export function openExternalLink(url: string): Promise<void> {
  return openUrl(url);
}

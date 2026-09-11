import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { UnlistenFn } from "@tauri-apps/api/event";

let previewSequence = 0;

export function openPreviewWindow(path: string): void {
  previewSequence += 1;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("previewPath", path);
  url.hash = "";
  const preview = new WebviewWindow(`preview-${previewSequence}`, {
    url: url.toString(),
    title: "Markdown Preview",
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 360,
    center: true,
  });
  void preview.once("tauri://error", (event) => console.error("Could not create preview window", event));
}

export function setWindowTitle(title: string): Promise<void> {
  return getCurrentWindow().setTitle(title);
}

/**
 * Quits the app. `destroy()` is a core command behind the ACL, so if the capability
 * ever goes missing again we fall back to an app-defined command, which is not gated.
 */
async function quit(): Promise<void> {
  try {
    await getCurrentWindow().destroy();
  } catch {
    await invoke("exit_app");
  }
}

/**
 * Intercepts the native window close. `confirmClose` runs only when `shouldBlock` says
 * there is something to lose, and its answer decides whether the app quits.
 *
 * Anything that throws in here has to still end in a quit: the close event is already
 * preventDefault-ed by then, and a rejected promise would leave the window unclosable.
 * The native OS dialog is used rather than window.confirm() because closing via the
 * title-bar X isn't a DOM user gesture, and WebView2 silently swallows confirm()/alert()
 * calls made outside one.
 */
export function onCloseRequested(
  shouldBlock: () => boolean,
  confirmClose: () => Promise<boolean>,
): Promise<UnlistenFn> {
  return getCurrentWindow().onCloseRequested(async (event) => {
    if (!shouldBlock()) return;
    event.preventDefault();

    let discard = true;
    try {
      discard = await confirmClose();
    } catch {
      // A broken confirm dialog must not trap the user in the app.
      discard = true;
    }
    if (discard) await quit();
  });
}

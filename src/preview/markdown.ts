import MarkdownIt from "markdown-it";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";

// html:false keeps raw HTML in the source escaped, which is what prevents
// script injection here — there is no sanitizer step after this.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const defaultImageRule = md.renderer.rules.image;

function resolveSibling(filePath: string, imagePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const base = normalized.slice(0, normalized.lastIndexOf("/") + 1);
  const parts = `${base}${imagePath}`.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/").replace(/^([A-Za-z]):/, "$1:/");
}

export function renderMarkdown(source: string, basePath?: string): string {
  return md.render(source, { basePath });
}

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const src = tokens[idx].attrGet("src");
  const basePath = env?.basePath as string | undefined;
  if (typeof src === "string" && basePath && isTauri() && !/^(?:[a-z]+:|[\\/]|#)/i.test(src)) {
    tokens[idx].attrSet("src", convertFileSrc(resolveSibling(basePath, src)));
  }
  return defaultImageRule?.(tokens, idx, options, env, self) ?? self.renderToken(tokens, idx, options);
};

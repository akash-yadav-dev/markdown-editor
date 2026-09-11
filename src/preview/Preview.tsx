import { useEffect, useMemo, useRef } from "react";

import { renderMarkdown } from "./markdown";
import { openExternalLink } from "../services/shellService";
import "./preview.css";

interface PreviewProps {
  content: string;
  basePath?: string;
}

export function Preview({ content, basePath }: PreviewProps) {
  const html = useMemo(() => renderMarkdown(content, basePath), [content, basePath]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      event.preventDefault();
      if (/^https?:\/\//i.test(href)) {
        void openExternalLink(href);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="preview-content"
      // Safe: markdown-it is configured with html:false, so `html` can only
      // contain markup generated from escaped source text, never raw HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

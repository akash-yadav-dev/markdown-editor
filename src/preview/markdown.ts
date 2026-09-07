import MarkdownIt from "markdown-it";

// html:false keeps raw HTML in the source escaped, which is what prevents
// script injection here — there is no sanitizer step after this.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function renderMarkdown(source: string): string {
  return md.render(source);
}

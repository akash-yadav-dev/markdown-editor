import { GFM, parser } from "@lezer/markdown";
import { Language, LanguageSupport, defineLanguageFacet, languageDataProp } from "@codemirror/language";

// A hand-assembled GFM language instead of @codemirror/lang-markdown: that
// package unconditionally pulls in @codemirror/lang-html (for embedded raw
// HTML regions), which drags lang-css and lang-javascript along with it —
// several hundred KB for a feature this editor doesn't use.
const data = defineLanguageFacet({
  commentTokens: { block: { open: "<!--", close: "-->" } },
});

const gfmParser = parser
  .configure({ props: [languageDataProp.add({ Document: data })] })
  .configure(GFM);

const markdownLanguage = new Language(data, gfmParser, [], "markdown");

export function markdown(): LanguageSupport {
  return new LanguageSupport(markdownLanguage);
}

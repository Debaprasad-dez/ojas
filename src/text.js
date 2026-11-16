// A markdown reply as one plain line: rich blocks become [chart], [table]…, markdown symbols are
// stripped. Used for context-panel previews and search snippets.
export const plainText = (text) =>
  text
    .replace(/```(\w*)[\s\S]*?(```|$)/g, (_, tag) => ` [${tag || 'code'}] `)
    .replace(/[*`]+/g, '') // emphasis hugs words: "**bold**," → "bold,"
    .replace(/[#_>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

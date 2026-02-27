// Z-Index sorting — see mcp_docs/Z_INDEX_PROTOCOL.md

import type { UILayer } from "../types.js";

const PREFIX_REGEX = /^(\d+)_/;
const DEFAULT_PREFIX = 50;

/**
 * Sort UI layers by their numeric Z-index prefix (ascending).
 * Lowest prefix = created first = bottom of visual stack in Max.
 * Layers without a prefix default to 50 (mid-stack).
 */
export function sortByZIndex(layers: UILayer[]): UILayer[] {
  return [...layers].sort((a, b) => {
    const prefixA = extractPrefix(a.name);
    const prefixB = extractPrefix(b.name);
    return prefixA - prefixB;
  });
}

function extractPrefix(name: string): number {
  const match = name.match(PREFIX_REGEX);
  return match ? parseInt(match[1], 10) : DEFAULT_PREFIX;
}

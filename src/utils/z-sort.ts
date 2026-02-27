// Figma Z-Index sorting — see mcp_docs/FIGMA_Z_INDEX_PROTOCOL.md

import type { FigmaLayer } from "../types.js";

const PREFIX_REGEX = /^(\d+)_/;
const DEFAULT_PREFIX = 50;

/**
 * Sort Figma layers by their numeric Z-index prefix (ascending).
 * Lowest prefix = created first = bottom of visual stack in Max.
 * Layers without a prefix default to 50 (mid-stack).
 */
export function sortByZIndex(layers: FigmaLayer[]): FigmaLayer[] {
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

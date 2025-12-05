/**
 * markdown-decision-tree
 *
 * A Decision Script Markdown (DSM) parser and converter.
 * Converts DSM Markdown to Mermaid graphs and Ink scripts.
 *
 * @example
 * ```typescript
 * import { toMermaid, toInk, parse } from 'markdown-decision-tree';
 *
 * const markdown = `
 * - **Q:** Did you send the email?
 *   - **IF:** "Yes"
 *     - **Q:** Why did you copy the competitor?
 *   - **IF:** "No"
 *     - **Q:** How is that possible?
 * `;
 *
 * // Convert to Mermaid for visualization
 * const mermaidGraph = toMermaid(markdown);
 *
 * // Convert to Ink for interactive practice
 * const inkScript = toInk(markdown);
 *
 * // Parse to AST for custom processing
 * const document = parse(markdown);
 * ```
 */

// Re-export types
export {
  DSMDocument,
  QuestionNode,
  IfNode,
  TopicNode,
  DSMNode,
  ParseError,
} from './types';

// Re-export parser
export { parse } from './parser';

// Re-export converters
export { toMermaid, toInk } from './converters';

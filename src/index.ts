/**
 * markdown-decision-tree
 *
 * A Markdown Decision Tree (MDT) parser and converter.
 * Converts MDT Markdown to Mermaid graphs and Ink scripts.
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
  MDTDocument,
  QuestionNode,
  IfNode,
  TopicNode,
  MDTNode,
  ParseError,
} from './types';

// Re-export parser
export { parse } from './parser';

// Re-export converters
export { toMermaid, toInk } from './converters';

/**
 * Converters for MDT (Markdown Decision Tree) to other formats.
 */

import { MDTDocument, QuestionNode, TopicNode } from './types';
import { parse } from './parser';

/**
 * Converts MDT Markdown to Mermaid graph syntax.
 *
 * @param markdown - Raw MDT Markdown string
 * @returns Mermaid graph TD syntax
 * @throws ParseError on invalid input
 *
 * @example
 * ```typescript
 * const markdown = `- **Q:** Question?`;
 * const mermaid = toMermaid(markdown);
 * // Output: graph TD
 * //     Q1["Q: Question?"]
 * ```
 */
export function toMermaid(markdown: string): string {
  const doc = parse(markdown);
  return generateMermaid(doc);
}

/**
 * Converts MDT Markdown to Ink choice script syntax.
 *
 * @param markdown - Raw MDT Markdown string
 * @returns Ink narration + choice syntax
 * @throws ParseError on invalid input
 *
 * @example
 * ```typescript
 * const markdown = `
 * - **Q:** Yes or no?
 *   - **IF:** "Yes"
 *     - **Q:** Why?
 * `;
 * const ink = toInk(markdown);
 * // Output: Q: Yes or no?
 * //
 * // + "Yes"
 * //     Q: Why?
 * ```
 */
export function toInk(markdown: string): string {
  const doc = parse(markdown);
  return generateInk(doc);
}

/**
 * Collect all Q-nodes from a document in ID order.
 */
function collectAllQuestions(doc: MDTDocument): QuestionNode[] {
  const questions: QuestionNode[] = [];

  function visitQuestion(q: QuestionNode): void {
    questions.push(q);
    for (const ifNode of q.children) {
      for (const childQ of ifNode.children) {
        visitQuestion(childQ);
      }
    }
  }

  function visitTopic(topic: TopicNode): void {
    for (const q of topic.questions) {
      visitQuestion(q);
    }
    for (const child of topic.children) {
      visitTopic(child);
    }
  }

  // Collect from root questions
  for (const q of doc.rootQuestions) {
    visitQuestion(q);
  }

  // Collect from topics
  for (const topic of doc.topics) {
    visitTopic(topic);
  }

  return questions;
}

/**
 * Escape text for Mermaid node labels.
 * Mermaid uses HTML entities for special characters.
 */
function escapeForMermaid(text: string): string {
  return text
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;');
}

/**
 * Generate Mermaid graph syntax from MDTDocument.
 */
function generateMermaid(doc: MDTDocument): string {
  const lines: string[] = ['graph TD'];
  const edges: string[] = [];

  // Collect all Q-nodes
  const allQuestions = collectAllQuestions(doc);

  // Generate node definitions
  for (const q of allQuestions) {
    const escapedText = escapeForMermaid(q.text);
    lines.push(`    ${q.id}["Q: ${escapedText}"]`);
  }

  // Generate edges (from Q-node through IF-node to child Q-nodes)
  // Edge labels don't need quote escaping in Mermaid
  function generateEdges(q: QuestionNode): void {
    for (const ifNode of q.children) {
      for (const childQ of ifNode.children) {
        edges.push(`    ${q.id} -->|${ifNode.answer}| ${childQ.id}`);
        generateEdges(childQ);
      }
    }
  }

  for (const q of doc.rootQuestions) {
    generateEdges(q);
  }

  for (const topic of doc.topics) {
    function visitTopicForEdges(t: TopicNode): void {
      for (const q of t.questions) {
        generateEdges(q);
      }
      for (const child of t.children) {
        visitTopicForEdges(child);
      }
    }
    visitTopicForEdges(topic);
  }

  return [...lines, ...edges].join('\n');
}

/**
 * Generate Ink script syntax from MDTDocument.
 */
function generateInk(doc: MDTDocument): string {
  const lines: string[] = [];

  function generateQuestion(q: QuestionNode, indent: number): void {
    const prefix = '    '.repeat(indent);
    lines.push(`${prefix}Q: ${q.text}`);

    if (q.children.length > 0) {
      lines.push(''); // Blank line before choices

      for (const ifNode of q.children) {
        lines.push(`${prefix}+ ${ifNode.answer}`);

        for (const childQ of ifNode.children) {
          generateQuestion(childQ, indent + 1);
        }
      }
    }
  }

  function generateTopic(topic: TopicNode): void {
    for (const q of topic.questions) {
      generateQuestion(q, 0);
    }
    for (const child of topic.children) {
      generateTopic(child);
    }
  }

  // Generate from root questions
  for (const q of doc.rootQuestions) {
    generateQuestion(q, 0);
  }

  // Generate from topics
  for (const topic of doc.topics) {
    generateTopic(topic);
  }

  return lines.join('\n');
}

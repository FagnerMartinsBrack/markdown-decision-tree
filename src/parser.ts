/**
 * DSM (Decision Script Markdown) parser.
 * Parses DSM Markdown into an AST representation.
 */

import {
  DSMDocument,
  QuestionNode,
  IfNode,
  TopicNode,
  ParseError,
} from './types';

/** Internal representation of a parsed line */
interface ParsedLine {
  lineNumber: number;
  type: 'heading' | 'question' | 'if' | 'blank';
  level?: number; // heading level (1-6) or indent level (0+)
  text?: string;
  spaces?: number; // exact number of leading spaces
}

/** Stack item for tree building */
interface StackItem {
  node: QuestionNode | IfNode | TopicNode;
  indentLevel: number;
}

/**
 * Parses DSM Markdown into a DSMDocument AST.
 *
 * @param markdown - Raw DSM Markdown string
 * @returns Parsed DSMDocument
 * @throws ParseError on invalid input
 */
export function parse(markdown: string): DSMDocument {
  // Handle empty input
  if (markdown.length === 0) {
    throw new ParseError('Document must contain at least one Q-node', 0);
  }

  // Check for final newline (required by spec)
  if (!markdown.endsWith('\n')) {
    throw new ParseError('Document must end with newline character', 0);
  }

  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, '\n');

  // Split into lines (keeping track of original line numbers)
  const lines = normalized.split('\n');

  // Pre-validate: check for tabs
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('\t')) {
      throw new ParseError('Tabs are not allowed; use spaces only', i + 1);
    }
  }

  // Parse all lines
  const parsedLines = parseLines(lines);

  // Build AST
  const doc = buildAST(parsedLines);

  // Validate document has at least one Q-node
  if (doc.rootQuestions.length === 0 && doc.topics.every(t => countQuestions(t) === 0)) {
    throw new ParseError('Document must contain at least one Q-node', 0);
  }

  // Assign Q-node IDs (pre-order depth-first)
  assignQuestionIds(doc);

  return doc;
}

/**
 * Parse all lines into intermediate representation.
 */
function parseLines(lines: string[]): ParsedLine[] {
  const parsed: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    // Skip the last empty line (from trailing newline)
    if (i === lines.length - 1 && line === '') {
      continue;
    }

    // Blank line check (line with only whitespace or empty)
    if (line.trim() === '') {
      parsed.push({ lineNumber, type: 'blank' });
      continue;
    }

    // Check for heading (must start at column 0)
    const headingMatch = line.match(/^(#{1,6}) (.+)$/);
    if (headingMatch) {
      parsed.push({
        lineNumber,
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // Check for list item
    const listMatch = line.match(/^( *)- (.*)$/);
    if (listMatch) {
      const spaces = listMatch[1].length;
      const content = listMatch[2];

      // Validate indent is multiple of 2
      if (spaces % 2 !== 0) {
        throw new ParseError(
          `Indent must be multiple of 2 spaces (got ${spaces} spaces)`,
          lineNumber
        );
      }

      const indentLevel = spaces / 2;

      // Parse the content to determine Q or IF
      const qMatch = content.match(/^\*\*Q:\*\* ?(.*)$/);
      if (qMatch) {
        const text = qMatch[1].trim();
        if (!text) {
          throw new ParseError('**Q:** marker requires non-empty text', lineNumber);
        }
        // Check for unbalanced bold markers in text
        validateNoBoldMarkers(text, lineNumber);
        parsed.push({
          lineNumber,
          type: 'question',
          level: indentLevel,
          text,
          spaces,
        });
        continue;
      }

      const ifMatch = content.match(/^\*\*IF:\*\* ?(.*)$/);
      if (ifMatch) {
        const text = ifMatch[1].trim();
        if (!text) {
          throw new ParseError('**IF:** marker requires non-empty text', lineNumber);
        }
        // Check for unbalanced bold markers in text
        validateNoBoldMarkers(text, lineNumber);
        parsed.push({
          lineNumber,
          type: 'if',
          level: indentLevel,
          text,
          spaces,
        });
        continue;
      }

      // Check for case-insensitive variants of markers
      const caseInsensitiveQ = content.match(/^\*\*(q|Q):\*\*/i);
      const caseInsensitiveIF = content.match(/^\*\*(if|If|iF|IF):\*\*/i);
      if (caseInsensitiveQ || caseInsensitiveIF) {
        throw new ParseError(
          'Markers must be exactly **Q:** or **IF:** (case-sensitive)',
          lineNumber
        );
      }

      // Check for other bold markers
      const otherBoldMatch = content.match(/^\*\*([^*]+):\*\*/);
      if (otherBoldMatch) {
        throw new ParseError(
          `Unknown bold marker (got: **${otherBoldMatch[1]}:**)`,
          lineNumber
        );
      }

      // List item without valid marker
      throw new ParseError('List item must start with **Q:** or **IF:**', lineNumber);
    }

    // Line doesn't match any valid construct - could be invalid heading or other
    // Check if it looks like a malformed heading
    if (line.match(/^#+/)) {
      throw new ParseError('Invalid heading format', lineNumber);
    }

    // Unknown line format
    throw new ParseError('Invalid line format', lineNumber);
  }

  return parsed;
}

/**
 * Validate that text doesn't contain unbalanced bold markers.
 */
function validateNoBoldMarkers(text: string, lineNumber: number): void {
  if (text.includes('**')) {
    throw new ParseError('Unbalanced bold markers in text', lineNumber);
  }
}

/**
 * Build the AST from parsed lines.
 */
function buildAST(parsedLines: ParsedLine[]): DSMDocument {
  const doc: DSMDocument = {
    rootQuestions: [],
    topics: [],
  };

  // Topic stack for handling heading hierarchy
  const topicStack: TopicNode[] = [];
  let currentTopic: TopicNode | null = null;

  // Node stack for handling Q/IF nesting
  const nodeStack: StackItem[] = [];

  for (const line of parsedLines) {
    if (line.type === 'blank') {
      continue;
    }

    if (line.type === 'heading') {
      // Create new topic
      const topic: TopicNode = {
        type: 'topic',
        level: line.level!,
        title: line.text!,
        children: [],
        questions: [],
        lineNumber: line.lineNumber,
      };

      // Clear node stack when entering new topic
      nodeStack.length = 0;

      // Handle topic hierarchy
      if (topicStack.length === 0) {
        // First topic
        doc.topics.push(topic);
        topicStack.push(topic);
      } else {
        // Find parent topic (if any) based on heading level
        while (topicStack.length > 0 && topicStack[topicStack.length - 1].level >= topic.level) {
          topicStack.pop();
        }

        if (topicStack.length > 0) {
          // This is a child topic
          topicStack[topicStack.length - 1].children.push(topic);
        } else {
          // This is a new top-level topic
          doc.topics.push(topic);
        }
        topicStack.push(topic);
      }

      currentTopic = topic;
      continue;
    }

    if (line.type === 'question') {
      const qNode: QuestionNode = {
        type: 'question',
        id: '', // Will be assigned later
        text: line.text!,
        children: [],
        lineNumber: line.lineNumber,
      };

      const indentLevel = line.level!;

      // IF at top level is forbidden
      if (indentLevel === 0) {
        // Top-level Q-node
        if (currentTopic) {
          currentTopic.questions.push(qNode);
        } else {
          doc.rootQuestions.push(qNode);
        }
        nodeStack.length = 0;
        nodeStack.push({ node: qNode, indentLevel: 0 });
      } else {
        // Nested Q-node - must be child of IF-node
        while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].indentLevel >= indentLevel) {
          nodeStack.pop();
        }

        if (nodeStack.length === 0) {
          throw new ParseError('Q-node at non-zero indent must have a parent', line.lineNumber);
        }

        const parent = nodeStack[nodeStack.length - 1].node;
        if (parent.type === 'question') {
          throw new ParseError('Q-node cannot be direct child of another Q-node', line.lineNumber);
        }

        // Parent is IF-node
        (parent as IfNode).children.push(qNode);
        nodeStack.push({ node: qNode, indentLevel });
      }
      continue;
    }

    if (line.type === 'if') {
      const ifNode: IfNode = {
        type: 'if',
        answer: line.text!,
        children: [],
        lineNumber: line.lineNumber,
      };

      const indentLevel = line.level!;

      // IF at top level is forbidden
      if (indentLevel === 0) {
        throw new ParseError('**IF:** node cannot appear at indent level 0', line.lineNumber);
      }

      // IF-node must be child of Q-node
      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].indentLevel >= indentLevel) {
        nodeStack.pop();
      }

      if (nodeStack.length === 0) {
        throw new ParseError('IF-node must have a parent Q-node', line.lineNumber);
      }

      const parent = nodeStack[nodeStack.length - 1].node;
      if (parent.type === 'if') {
        throw new ParseError('IF-node cannot be direct child of another IF-node', line.lineNumber);
      }

      // Parent is Q-node
      (parent as QuestionNode).children.push(ifNode);
      nodeStack.push({ node: ifNode, indentLevel });
      continue;
    }
  }

  return doc;
}

/**
 * Count total Q-nodes under a topic (including nested topics).
 */
function countQuestions(topic: TopicNode): number {
  let count = topic.questions.length;
  for (const child of topic.children) {
    count += countQuestions(child);
  }
  // Also count nested questions within Q-nodes
  for (const q of topic.questions) {
    count += countNestedQuestions(q);
  }
  return count;
}

/**
 * Count nested Q-nodes within a Q-node's IF branches.
 */
function countNestedQuestions(q: QuestionNode): number {
  let count = 0;
  for (const ifNode of q.children) {
    count += ifNode.children.length;
    for (const childQ of ifNode.children) {
      count += countNestedQuestions(childQ);
    }
  }
  return count;
}

/**
 * Assign sequential IDs to all Q-nodes in pre-order depth-first traversal.
 */
function assignQuestionIds(doc: DSMDocument): void {
  let counter = 1;

  function visitQuestion(q: QuestionNode): void {
    q.id = `Q${counter++}`;
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

  // Visit root questions first (in document order)
  for (const q of doc.rootQuestions) {
    visitQuestion(q);
  }

  // Then visit questions under each topic (in document order)
  for (const topic of doc.topics) {
    visitTopic(topic);
  }
}

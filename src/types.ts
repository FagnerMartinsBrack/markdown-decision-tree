/**
 * Type definitions for Decision Script Markdown (DSM) format.
 */

/**
 * Represents a question node in the decision tree.
 * Q-nodes contain the question text and can have IF-node children
 * representing different answer branches.
 */
export interface QuestionNode {
  type: 'question';
  /** Unique sequential ID: "Q1", "Q2", etc. Assigned in pre-order depth-first traversal. */
  id: string;
  /** The question text (without the **Q:** marker) */
  text: string;
  /** Child IF-nodes representing answer branches. Q-nodes can only have IF-node children. */
  children: IfNode[];
  /** 1-indexed line number where this node appears in the source */
  lineNumber: number;
}

/**
 * Represents a branch condition node in the decision tree.
 * IF-nodes contain an expected answer and can have Q-node children
 * representing follow-up questions for that answer.
 */
export interface IfNode {
  type: 'if';
  /** The expected answer text (without the **IF:** marker) */
  answer: string;
  /** Child Q-nodes representing follow-up questions. IF-nodes can only have Q-node children. */
  children: QuestionNode[];
  /** 1-indexed line number where this node appears in the source */
  lineNumber: number;
}

/**
 * Represents a topic/section header in the decision tree.
 * Topics group related questions under ATX-style headings.
 */
export interface TopicNode {
  type: 'topic';
  /** Heading level: 1-6 corresponding to # through ###### */
  level: number;
  /** The heading text (without the # markers) */
  title: string;
  /** Nested sub-topics (headings of lower level) */
  children: TopicNode[];
  /** Q-nodes directly under this topic */
  questions: QuestionNode[];
  /** 1-indexed line number where this heading appears in the source */
  lineNumber: number;
}

/**
 * Union type for Q-nodes and IF-nodes.
 */
export type DSMNode = QuestionNode | IfNode;

/**
 * Represents a parsed DSM document.
 */
export interface DSMDocument {
  /** Q-nodes that appear before any heading (orphan questions) */
  rootQuestions: QuestionNode[];
  /** Top-level topics (# headings) */
  topics: TopicNode[];
}

/**
 * Error thrown when parsing invalid DSM Markdown.
 */
export class ParseError extends Error {
  /** 1-indexed line number where the error occurred */
  lineNumber: number;

  constructor(message: string, lineNumber: number) {
    super(`${message} (line ${lineNumber})`);
    this.name = 'ParseError';
    this.lineNumber = lineNumber;
    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

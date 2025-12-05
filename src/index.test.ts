/**
 * Integration tests for markdown-decision-tree.
 * These tests verify the complete flow from input to output using
 * examples from the README specification.
 */

import {
  parse,
  toMermaid,
  toInk,
  MDTDocument,
  QuestionNode,
  IfNode,
  TopicNode,
  ParseError,
} from './index';

describe('Public API exports', () => {
  it('exports parse function', () => {
    expect(typeof parse).toBe('function');
  });

  it('exports toMermaid function', () => {
    expect(typeof toMermaid).toBe('function');
  });

  it('exports toInk function', () => {
    expect(typeof toInk).toBe('function');
  });

  it('exports ParseError class', () => {
    expect(ParseError).toBeDefined();
    expect(new ParseError('test', 1) instanceof Error).toBe(true);
  });
});

describe('Integration: README Example 1 - Minimal Question', () => {
  const input = '- **Q:** What is your name?\n';

  it('parse returns correct AST', () => {
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[0].text).toBe('What is your name?');
    expect(doc.rootQuestions[0].children).toHaveLength(0);
  });

  it('toMermaid matches README expected output', () => {
    const output = toMermaid(input);
    expect(output).toBe(`graph TD
    Q1["Q: What is your name?"]`);
  });

  it('toInk matches README expected output', () => {
    const output = toInk(input);
    expect(output).toBe('Q: What is your name?');
  });
});

describe('Integration: README Example 2 - Simple Branching', () => {
  const input = `# Cross Examination

- **Q:** Did you send the email?
  - **IF:** "Yes"
    - **Q:** Why did you copy the competitor?
  - **IF:** "No"
    - **Q:** This email is from your account. How is that possible?
`;

  it('parse returns correct AST structure', () => {
    const doc = parse(input);

    // Should have one topic
    expect(doc.topics).toHaveLength(1);
    expect(doc.topics[0].title).toBe('Cross Examination');

    // Topic should have one question
    const q1 = doc.topics[0].questions[0];
    expect(q1.id).toBe('Q1');
    expect(q1.text).toBe('Did you send the email?');
    expect(q1.children).toHaveLength(2);

    // First branch
    expect(q1.children[0].answer).toBe('"Yes"');
    expect(q1.children[0].children[0].id).toBe('Q2');
    expect(q1.children[0].children[0].text).toBe('Why did you copy the competitor?');

    // Second branch
    expect(q1.children[1].answer).toBe('"No"');
    expect(q1.children[1].children[0].id).toBe('Q3');
    expect(q1.children[1].children[0].text).toBe(
      'This email is from your account. How is that possible?'
    );
  });

  it('toMermaid matches README expected output', () => {
    const output = toMermaid(input);
    expect(output).toContain('graph TD');
    expect(output).toContain('Q1["Q: Did you send the email?"]');
    expect(output).toContain('Q2["Q: Why did you copy the competitor?"]');
    expect(output).toContain(
      'Q3["Q: This email is from your account. How is that possible?"]'
    );
    expect(output).toContain('Q1 -->|"Yes"| Q2');
    expect(output).toContain('Q1 -->|"No"| Q3');
  });

  it('toInk matches README expected output', () => {
    const output = toInk(input);
    expect(output).toContain('Q: Did you send the email?');
    expect(output).toContain('+ "Yes"');
    expect(output).toContain('    Q: Why did you copy the competitor?');
    expect(output).toContain('+ "No"');
    expect(output).toContain(
      '    Q: This email is from your account. How is that possible?'
    );
  });
});

describe('Integration: README Example 3 - Complex Nested Branching', () => {
  const input = `# Witness Testimony

- **Q:** Who was present at the meeting on June 12th?
  - **IF:** "I don't recall"
    - **Q:** Is there a document that would refresh your recollection?
      - **IF:** "Yes"
        - **Q:** Showing Exhibit A, does this refresh your memory?
      - **IF:** "No"
        - **Q:** Have you made any attempts to recall the attendees?
  - **IF:** "Just me and Mr. Smith"
    - **Q:** Was anyone joining via phone?
  - **IF:** "Me, Mr. Smith, and Ms. Jones"
    - **Q:** Let's focus on Ms. Jones. What was her demeanor?
`;

  it('assigns Q-node IDs in depth-first order per README', () => {
    const doc = parse(input);
    const q1 = doc.topics[0].questions[0];

    // Q1: "Who was present at the meeting on June 12th?"
    expect(q1.id).toBe('Q1');

    // Q2: "Is there a document that would refresh your recollection?"
    expect(q1.children[0].children[0].id).toBe('Q2');

    // Q3: "Showing Exhibit A, does this refresh your memory?"
    expect(q1.children[0].children[0].children[0].children[0].id).toBe('Q3');

    // Q4: "Have you made any attempts to recall the attendees?"
    expect(q1.children[0].children[0].children[1].children[0].id).toBe('Q4');

    // Q5: "Was anyone joining via phone?"
    expect(q1.children[1].children[0].id).toBe('Q5');

    // Q6: "Let's focus on Ms. Jones. What was her demeanor?"
    expect(q1.children[2].children[0].id).toBe('Q6');
  });

  it('toMermaid generates all edges correctly', () => {
    const output = toMermaid(input);

    // All nodes present
    expect(output).toContain('Q1["Q: Who was present at the meeting on June 12th?"]');
    expect(output).toContain(
      'Q2["Q: Is there a document that would refresh your recollection?"]'
    );
    expect(output).toContain(
      'Q3["Q: Showing Exhibit A, does this refresh your memory?"]'
    );
    expect(output).toContain(
      'Q4["Q: Have you made any attempts to recall the attendees?"]'
    );
    expect(output).toContain('Q5["Q: Was anyone joining via phone?"]');
    expect(output).toContain(
      'Q6["Q: Let&apos;s focus on Ms. Jones. What was her demeanor?"]'.replace(
        '&apos;',
        "'"
      )
    );

    // All edges present
    expect(output).toContain("Q1 -->|\"I don't recall\"| Q2");
    expect(output).toContain('Q2 -->|"Yes"| Q3');
    expect(output).toContain('Q2 -->|"No"| Q4');
    expect(output).toContain('Q1 -->|"Just me and Mr. Smith"| Q5');
    expect(output).toContain('Q1 -->|"Me, Mr. Smith, and Ms. Jones"| Q6');
  });
});

describe('Integration: Error handling end-to-end', () => {
  it('throws ParseError with correct line number for IF at top level', () => {
    const input = `- **Q:** Valid question
- **IF:** Invalid top-level IF
`;
    try {
      parse(input);
      fail('Expected ParseError');
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).lineNumber).toBe(2);
    }
  });

  it('toMermaid throws ParseError for invalid input', () => {
    expect(() => toMermaid('- **Q:** No newline')).toThrow(ParseError);
  });

  it('toInk throws ParseError for invalid input', () => {
    expect(() => toInk('- Invalid format\n')).toThrow(ParseError);
  });
});

describe('Integration: Type safety', () => {
  it('parsed document has correct types', () => {
    const input = `# Topic

- **Q:** Question?
  - **IF:** "Answer"
    - **Q:** Follow-up?
`;
    const doc: MDTDocument = parse(input);

    // Verify TopicNode
    const topic: TopicNode = doc.topics[0];
    expect(topic.type).toBe('topic');
    expect(topic.level).toBe(1);

    // Verify QuestionNode
    const q1: QuestionNode = topic.questions[0];
    expect(q1.type).toBe('question');
    expect(q1.id).toBe('Q1');

    // Verify IfNode
    const ifNode: IfNode = q1.children[0];
    expect(ifNode.type).toBe('if');
    expect(ifNode.answer).toBe('"Answer"');

    // Verify nested QuestionNode
    const q2: QuestionNode = ifNode.children[0];
    expect(q2.type).toBe('question');
    expect(q2.id).toBe('Q2');
  });
});

describe('Integration: Real-world usage patterns', () => {
  it('handles legal deposition workflow', () => {
    const depositionScript = `# Cross-Exam: Contract Dispute

- **Q:** Did you read the contract before signing?
  - **IF:** "Yes"
    - **Q:** Did you understand section 3.2?
      - **IF:** "Yes"
        - **Q:** Then why did you violate it?
      - **IF:** "No"
        - **Q:** Did you seek legal counsel?
  - **IF:** "No"
    - **Q:** Is it your practice to sign contracts without reading them?

# Damages

- **Q:** What damages have you suffered?
  - **IF:** "Lost revenue"
    - **Q:** How did you calculate this amount?
  - **IF:** "Reputation damage"
    - **Q:** Can you quantify this?
`;
    const doc = parse(depositionScript);

    // Verify structure
    expect(doc.topics).toHaveLength(2);
    expect(doc.topics[0].title).toBe('Cross-Exam: Contract Dispute');
    expect(doc.topics[1].title).toBe('Damages');

    // Verify Q-node IDs are sequential across topics
    expect(doc.topics[0].questions[0].id).toBe('Q1');
    expect(doc.topics[1].questions[0].id).toBe('Q6');

    // Generate both outputs without error
    const mermaid = toMermaid(depositionScript);
    const ink = toInk(depositionScript);

    expect(mermaid).toContain('graph TD');
    expect(ink).toContain('Q: Did you read the contract');
  });
});

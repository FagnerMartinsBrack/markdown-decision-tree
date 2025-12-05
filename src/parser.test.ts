import { parse } from './parser';
import { ParseError } from './types';

describe('parse - valid documents', () => {
  it('parses minimal single Q-node', () => {
    const input = '- **Q:** First question?\n';
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[0].text).toBe('First question?');
    expect(doc.rootQuestions[0].lineNumber).toBe(1);
  });

  it('parses multiple top-level Q-nodes', () => {
    const input = `- **Q:** First question?
- **Q:** Second question?
- **Q:** Third question?
`;
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(3);
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[1].id).toBe('Q2');
    expect(doc.rootQuestions[2].id).toBe('Q3');
  });

  it('parses simple branching structure', () => {
    const input = `- **Q:** Did you send the email?
  - **IF:** "Yes"
    - **Q:** Why did you copy the competitor?
  - **IF:** "No"
    - **Q:** How is that possible?
`;
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
    expect(doc.rootQuestions[0].children).toHaveLength(2);
    expect(doc.rootQuestions[0].children[0].answer).toBe('"Yes"');
    expect(doc.rootQuestions[0].children[1].answer).toBe('"No"');
    expect(doc.rootQuestions[0].children[0].children).toHaveLength(1);
    expect(doc.rootQuestions[0].children[1].children).toHaveLength(1);
  });

  it('parses deeply nested structure', () => {
    const input = `- **Q:** Level 0 question
  - **IF:** "Answer 1"
    - **Q:** Level 2 question
      - **IF:** "Nested answer"
        - **Q:** Level 4 question
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[0].children[0].children[0].id).toBe('Q2');
    expect(doc.rootQuestions[0].children[0].children[0].children[0].children[0].id).toBe('Q3');
  });

  it('handles multiple IF branches under single Q', () => {
    const input = `- **Q:** Who was present?
  - **IF:** "I don't recall"
    - **Q:** Is there documentation?
  - **IF:** "Just me and Mr. Smith"
    - **Q:** Why was Ms. Jones excluded?
  - **IF:** "Me, Mr. Smith, and Ms. Jones"
    - **Q:** What was her demeanor?
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children).toHaveLength(3);
  });

  it('handles blank lines between nodes', () => {
    const input = `- **Q:** First question?

  - **IF:** "Yes"

    - **Q:** Follow-up?
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children).toHaveLength(1);
    expect(doc.rootQuestions[0].children[0].children).toHaveLength(1);
  });

  it('handles UTF-8 text', () => {
    const input = '- **Q:** Pregunta en espanol?\n';
    const doc = parse(input);
    expect(doc.rootQuestions[0].text).toBe('Pregunta en espanol?');
  });

  it('handles special characters in text', () => {
    const input = '- **Q:** What about $100 & "quotes"?\n';
    const doc = parse(input);
    expect(doc.rootQuestions[0].text).toBe('What about $100 & "quotes"?');
  });

  it('preserves quotes in IF-node answers', () => {
    const input = `- **Q:** Question?
  - **IF:** "Quoted answer"
    - **Q:** Follow-up?
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children[0].answer).toBe('"Quoted answer"');
  });

  it('handles Windows line endings (CRLF)', () => {
    const input = '- **Q:** First question?\r\n  - **IF:** "Yes"\r\n    - **Q:** Follow-up?\r\n';
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
    expect(doc.rootQuestions[0].children).toHaveLength(1);
  });
});

describe('parse - Q-node ID assignment', () => {
  it('assigns IDs in pre-order depth-first traversal', () => {
    const input = `- **Q:** Q1 text
  - **IF:** "branch 1"
    - **Q:** Q2 text
      - **IF:** "nested"
        - **Q:** Q3 text
  - **IF:** "branch 2"
    - **Q:** Q4 text
`;
    const doc = parse(input);
    // Pre-order depth-first: Q1 -> (IF -> Q2 -> (IF -> Q3)) -> (IF -> Q4)
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[0].children[0].children[0].id).toBe('Q2');
    expect(doc.rootQuestions[0].children[0].children[0].children[0].children[0].id).toBe('Q3');
    expect(doc.rootQuestions[0].children[1].children[0].id).toBe('Q4');
  });

  it('assigns IDs sequentially across multiple root questions', () => {
    const input = `- **Q:** First root
  - **IF:** "Yes"
    - **Q:** Nested under first
- **Q:** Second root
  - **IF:** "No"
    - **Q:** Nested under second
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].id).toBe('Q1');
    expect(doc.rootQuestions[0].children[0].children[0].id).toBe('Q2');
    expect(doc.rootQuestions[1].id).toBe('Q3');
    expect(doc.rootQuestions[1].children[0].children[0].id).toBe('Q4');
  });

  it('assigns IDs matching README example', () => {
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
    const doc = parse(input);
    const q1 = doc.topics[0].questions[0];
    expect(q1.id).toBe('Q1');
    expect(q1.children[0].children[0].id).toBe('Q2'); // "Is there a document..."
    expect(q1.children[0].children[0].children[0].children[0].id).toBe('Q3'); // "Showing Exhibit A..."
    expect(q1.children[0].children[0].children[1].children[0].id).toBe('Q4'); // "Have you made any attempts..."
    expect(q1.children[1].children[0].id).toBe('Q5'); // "Was anyone joining..."
    expect(q1.children[2].children[0].id).toBe('Q6'); // "Let's focus on Ms. Jones..."
  });
});

describe('parse - topics/headings', () => {
  it('groups questions under topic', () => {
    const input = `# Topic Title

- **Q:** Question under topic?
`;
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(0);
    expect(doc.topics).toHaveLength(1);
    expect(doc.topics[0].title).toBe('Topic Title');
    expect(doc.topics[0].questions).toHaveLength(1);
  });

  it('handles multiple topics', () => {
    const input = `# First Topic

- **Q:** First question?

# Second Topic

- **Q:** Second question?
`;
    const doc = parse(input);
    expect(doc.topics).toHaveLength(2);
    expect(doc.topics[0].title).toBe('First Topic');
    expect(doc.topics[1].title).toBe('Second Topic');
    expect(doc.topics[0].questions).toHaveLength(1);
    expect(doc.topics[1].questions).toHaveLength(1);
  });

  it('handles nested topics', () => {
    const input = `# Main Topic

## Subtopic

- **Q:** Nested question?
`;
    const doc = parse(input);
    expect(doc.topics).toHaveLength(1);
    expect(doc.topics[0].title).toBe('Main Topic');
    expect(doc.topics[0].children).toHaveLength(1);
    expect(doc.topics[0].children[0].title).toBe('Subtopic');
    expect(doc.topics[0].children[0].questions).toHaveLength(1);
  });

  it('handles heading levels 1-6', () => {
    const input = `# H1
## H2
### H3
#### H4
##### H5
###### H6

- **Q:** Question?
`;
    const doc = parse(input);
    expect(doc.topics[0].level).toBe(1);
    expect(doc.topics[0].children[0].level).toBe(2);
  });

  it('handles root questions before any topic', () => {
    const input = `- **Q:** Root question?

# Topic

- **Q:** Topic question?
`;
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
    expect(doc.rootQuestions[0].text).toBe('Root question?');
    expect(doc.topics).toHaveLength(1);
    expect(doc.topics[0].questions).toHaveLength(1);
  });
});

describe('parse - error handling', () => {
  it('throws on empty document', () => {
    expect(() => parse('')).toThrow(ParseError);
    expect(() => parse('')).toThrow('Document must contain at least one Q-node');
  });

  it('throws on document with only whitespace', () => {
    expect(() => parse('\n')).toThrow('Document must contain at least one Q-node');
  });

  it('throws on document with only heading', () => {
    expect(() => parse('# Topic\n')).toThrow('Document must contain at least one Q-node');
  });

  it('throws on missing final newline', () => {
    expect(() => parse('- **Q:** Question?')).toThrow('Document must end with newline character');
  });

  it('throws on tab character', () => {
    expect(() => parse('- **Q:** Question\n\t- **IF:** Answer\n')).toThrow(
      /Tabs are not allowed; use spaces only/
    );
  });

  it('throws on invalid indent (odd spaces)', () => {
    expect(() =>
      parse(`- **Q:** Q1
   - **IF:** Answer
`)
    ).toThrow(/Indent must be multiple of 2 spaces/);
  });

  it('throws on IF-node at top level', () => {
    expect(() => parse('- **IF:** Top level if\n')).toThrow(
      '**IF:** node cannot appear at indent level 0'
    );
  });

  it('throws on Q-node as direct child of Q-node', () => {
    expect(() =>
      parse(`- **Q:** Parent
  - **Q:** Child
`)
    ).toThrow('Q-node cannot be direct child of another Q-node');
  });

  it('throws on IF-node as direct child of IF-node', () => {
    expect(() =>
      parse(`- **Q:** Parent
  - **IF:** First IF
    - **IF:** Nested IF
`)
    ).toThrow('IF-node cannot be direct child of another IF-node');
  });

  it('throws on empty Q-node text', () => {
    expect(() => parse('- **Q:**\n')).toThrow('**Q:** marker requires non-empty text');
  });

  it('throws on empty IF-node text', () => {
    expect(() =>
      parse(`- **Q:** Question
  - **IF:**
`)
    ).toThrow('**IF:** marker requires non-empty text');
  });

  it('throws on Q-node with only whitespace after marker', () => {
    expect(() => parse('- **Q:**   \n')).toThrow('**Q:** marker requires non-empty text');
  });

  it('throws on list item without valid marker', () => {
    expect(() => parse('- Invalid item\n')).toThrow('List item must start with **Q:** or **IF:**');
  });

  it('throws on unknown bold marker', () => {
    expect(() => parse('- **OTHER:** Text\n')).toThrow(/Unknown bold marker/);
  });

  it('throws on lowercase q marker', () => {
    expect(() => parse('- **q:** Text\n')).toThrow(
      'Markers must be exactly **Q:** or **IF:** (case-sensitive)'
    );
  });

  it('throws on lowercase if marker', () => {
    expect(() =>
      parse(`- **Q:** Question
  - **if:** Answer
`)
    ).toThrow('Markers must be exactly **Q:** or **IF:** (case-sensitive)');
  });

  it('throws on unbalanced bold markers in text', () => {
    expect(() => parse('- **Q:** What about **bold** text?\n')).toThrow(
      'Unbalanced bold markers in text'
    );
  });

  it('includes line number in error message', () => {
    try {
      parse(`- **Q:** Valid
- **q:** Invalid
`);
      fail('Expected ParseError');
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).lineNumber).toBe(2);
      expect((e as ParseError).message).toContain('line 2');
    }
  });
});

describe('parse - edge cases', () => {
  it('handles multiple blank lines', () => {
    const input = `- **Q:** First


  - **IF:** Yes


    - **Q:** Second
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children[0].children[0].text).toBe('Second');
  });

  it('handles Q-node with very long text', () => {
    const longText = 'A'.repeat(500);
    const input = `- **Q:** ${longText}\n`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].text).toBe(longText);
  });

  it('handles deeply nested structure (10 levels)', () => {
    let input = '- **Q:** L0\n';
    for (let i = 1; i < 10; i++) {
      const spaces = '  '.repeat(i);
      if (i % 2 === 1) {
        input += `${spaces}- **IF:** A${i}\n`;
      } else {
        input += `${spaces}- **Q:** L${i}\n`;
      }
    }
    const doc = parse(input);
    expect(doc.rootQuestions).toHaveLength(1);
  });

  it('handles IF answer with special characters', () => {
    const input = `- **Q:** Question?
  - **IF:** "Yes! @#$%^&*()"
    - **Q:** Follow-up?
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children[0].answer).toBe('"Yes! @#$%^&*()"');
  });

  it('handles multiple Q-nodes under same IF', () => {
    const input = `- **Q:** Main question?
  - **IF:** "Yes"
    - **Q:** First follow-up?
    - **Q:** Second follow-up?
    - **Q:** Third follow-up?
`;
    const doc = parse(input);
    expect(doc.rootQuestions[0].children[0].children).toHaveLength(3);
    expect(doc.rootQuestions[0].children[0].children[0].id).toBe('Q2');
    expect(doc.rootQuestions[0].children[0].children[1].id).toBe('Q3');
    expect(doc.rootQuestions[0].children[0].children[2].id).toBe('Q4');
  });

  it('handles sibling topics at same level', () => {
    const input = `# Topic A

- **Q:** Question A?

# Topic B

- **Q:** Question B?
`;
    const doc = parse(input);
    expect(doc.topics).toHaveLength(2);
    expect(doc.topics[0].level).toBe(1);
    expect(doc.topics[1].level).toBe(1);
  });

  it('handles returning to higher level topic', () => {
    const input = `# Main

## Sub

- **Q:** Sub question?

# Another Main

- **Q:** Another question?
`;
    const doc = parse(input);
    expect(doc.topics).toHaveLength(2);
    expect(doc.topics[0].children).toHaveLength(1);
    expect(doc.topics[1].children).toHaveLength(0);
  });
});

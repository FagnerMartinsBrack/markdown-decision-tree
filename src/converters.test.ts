import { toMermaid, toInk } from './converters';
import { ParseError } from './types';

describe('toMermaid', () => {
  it('generates minimal graph', () => {
    const input = '- **Q:** What is your name?\n';
    const output = toMermaid(input);
    expect(output).toBe(`graph TD
    Q1["Q: What is your name?"]`);
  });

  it('generates multiple nodes', () => {
    const input = `- **Q:** First?
- **Q:** Second?
`;
    const output = toMermaid(input);
    expect(output).toContain('Q1["Q: First?"]');
    expect(output).toContain('Q2["Q: Second?"]');
  });

  it('generates edges for branching', () => {
    const input = `- **Q:** Did you send the email?
  - **IF:** "Yes"
    - **Q:** Why?
  - **IF:** "No"
    - **Q:** How?
`;
    const output = toMermaid(input);
    expect(output).toContain('Q1 -->|"Yes"| Q2');
    expect(output).toContain('Q1 -->|"No"| Q3');
  });

  it('generates deeply nested edges', () => {
    const input = `- **Q:** L1
  - **IF:** A
    - **Q:** L2
      - **IF:** B
        - **Q:** L3
`;
    const output = toMermaid(input);
    expect(output).toContain('Q1 -->|A| Q2');
    expect(output).toContain('Q2 -->|B| Q3');
  });

  it('escapes special characters - quotes', () => {
    const input = '- **Q:** Is "this" a test?\n';
    const output = toMermaid(input);
    expect(output).toContain('&quot;this&quot;');
  });

  it('escapes special characters - brackets', () => {
    const input = '- **Q:** What about [brackets]?\n';
    const output = toMermaid(input);
    expect(output).toContain('#91;brackets#93;');
  });

  it('escapes special characters - angle brackets', () => {
    const input = '- **Q:** Is x < y > z?\n';
    const output = toMermaid(input);
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
  });

  it('handles questions under topics', () => {
    const input = `# Topic

- **Q:** Under topic?
`;
    const output = toMermaid(input);
    expect(output).toContain('Q1["Q: Under topic?"]');
  });

  it('generates valid Mermaid header', () => {
    const input = '- **Q:** Test?\n';
    const output = toMermaid(input);
    expect(output.startsWith('graph TD')).toBe(true);
  });

  it('uses correct indentation (4 spaces)', () => {
    const input = '- **Q:** Test?\n';
    const output = toMermaid(input);
    const lines = output.split('\n');
    expect(lines[1]).toMatch(/^    Q1/);
  });

  it('throws ParseError on invalid input', () => {
    expect(() => toMermaid('invalid')).toThrow(ParseError);
  });

  it('matches README example - simple branching', () => {
    const input = `# Cross Examination

- **Q:** Did you send the email?
  - **IF:** "Yes"
    - **Q:** Why did you copy the competitor?
  - **IF:** "No"
    - **Q:** This email is from your account. How is that possible?
`;
    const output = toMermaid(input);
    expect(output).toContain('graph TD');
    expect(output).toContain('Q1["Q: Did you send the email?"]');
    expect(output).toContain('Q2["Q: Why did you copy the competitor?"]');
    expect(output).toContain('Q3["Q: This email is from your account. How is that possible?"]');
    expect(output).toContain('Q1 -->|"Yes"| Q2');
    expect(output).toContain('Q1 -->|"No"| Q3');
  });
});

describe('toInk', () => {
  it('generates minimal output', () => {
    const input = '- **Q:** What is your name?\n';
    const output = toInk(input);
    expect(output).toBe('Q: What is your name?');
  });

  it('generates choices with + prefix', () => {
    const input = `- **Q:** Yes or no?
  - **IF:** "Yes"
    - **Q:** Why?
`;
    const output = toInk(input);
    expect(output).toContain('+ "Yes"');
  });

  it('indents nested questions', () => {
    const input = `- **Q:** Parent?
  - **IF:** "Answer"
    - **Q:** Child?
`;
    const output = toInk(input);
    const lines = output.split('\n');
    const childLine = lines.find(l => l.includes('Child?'));
    expect(childLine).toBeDefined();
    expect(childLine).toMatch(/^    Q:/);
  });

  it('generates blank line before choices', () => {
    const input = `- **Q:** Question?
  - **IF:** "Yes"
    - **Q:** Follow-up?
`;
    const output = toInk(input);
    expect(output).toContain('Question?\n\n+ "Yes"');
  });

  it('generates blank line before each sibling choice', () => {
    const input = `- **Q:** Question?
  - **IF:** "Yes"
    - **Q:** Follow-up 1
  - **IF:** "No"
    - **Q:** Follow-up 2
`;
    const output = toInk(input);
    // Each choice should be preceded by a blank line
    expect(output).toContain('Question?\n\n+ "Yes"');
    expect(output).toContain('Follow-up 1\n\n+ "No"');
  });

  it('handles multiple branches', () => {
    const input = `- **Q:** Choose?
  - **IF:** "A"
    - **Q:** Chose A
  - **IF:** "B"
    - **Q:** Chose B
  - **IF:** "C"
    - **Q:** Chose C
`;
    const output = toInk(input);
    expect(output).toContain('+ "A"');
    expect(output).toContain('+ "B"');
    expect(output).toContain('+ "C"');
  });

  it('handles deeply nested structure', () => {
    const input = `- **Q:** L1
  - **IF:** A
    - **Q:** L2
      - **IF:** B
        - **Q:** L3
`;
    const output = toInk(input);
    // L3 should have 8 spaces (2 levels of indent, 4 spaces each)
    expect(output).toContain('        Q: L3');
  });

  it('handles questions without branches', () => {
    const input = `- **Q:** First?
- **Q:** Second?
`;
    const output = toInk(input);
    expect(output).toBe('Q: First?\nQ: Second?');
  });

  it('handles questions under topics', () => {
    const input = `# Topic

- **Q:** Under topic?
`;
    const output = toInk(input);
    expect(output).toBe('Q: Under topic?');
  });

  it('throws ParseError on invalid input', () => {
    expect(() => toInk('invalid')).toThrow(ParseError);
  });

  it('matches README example - simple branching', () => {
    const input = `# Cross Examination

- **Q:** Did you send the email?
  - **IF:** "Yes"
    - **Q:** Why did you copy the competitor?
  - **IF:** "No"
    - **Q:** This email is from your account. How is that possible?
`;
    const output = toInk(input);
    expect(output).toContain('Q: Did you send the email?');
    expect(output).toContain('+ "Yes"');
    expect(output).toContain('    Q: Why did you copy the competitor?');
    expect(output).toContain('+ "No"');
    expect(output).toContain('    Q: This email is from your account. How is that possible?');
  });
});

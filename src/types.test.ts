import { ParseError, QuestionNode, IfNode, TopicNode, DSMDocument } from './types';

describe('ParseError', () => {
  it('should include line number in message', () => {
    const error = new ParseError('Test error', 5);
    expect(error.message).toBe('Test error (line 5)');
    expect(error.lineNumber).toBe(5);
  });

  it('should have correct name property', () => {
    const error = new ParseError('Test', 1);
    expect(error.name).toBe('ParseError');
  });

  it('should be instanceof Error', () => {
    const error = new ParseError('Test', 1);
    expect(error instanceof Error).toBe(true);
  });

  it('should be instanceof ParseError', () => {
    const error = new ParseError('Test', 1);
    expect(error instanceof ParseError).toBe(true);
  });

  it('should handle line number 0', () => {
    const error = new ParseError('Pre-parse error', 0);
    expect(error.message).toBe('Pre-parse error (line 0)');
    expect(error.lineNumber).toBe(0);
  });

  it('should preserve stack trace', () => {
    const error = new ParseError('Stack test', 10);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ParseError');
  });
});

describe('Type structures', () => {
  it('should allow creating a valid QuestionNode', () => {
    const node: QuestionNode = {
      type: 'question',
      id: 'Q1',
      text: 'What is your name?',
      children: [],
      lineNumber: 1,
    };
    expect(node.type).toBe('question');
    expect(node.id).toBe('Q1');
  });

  it('should allow creating a valid IfNode', () => {
    const node: IfNode = {
      type: 'if',
      answer: '"Yes"',
      children: [],
      lineNumber: 2,
    };
    expect(node.type).toBe('if');
    expect(node.answer).toBe('"Yes"');
  });

  it('should allow creating a valid TopicNode', () => {
    const node: TopicNode = {
      type: 'topic',
      level: 1,
      title: 'Cross Examination',
      children: [],
      questions: [],
      lineNumber: 1,
    };
    expect(node.type).toBe('topic');
    expect(node.level).toBe(1);
  });

  it('should allow creating a valid DSMDocument', () => {
    const doc: DSMDocument = {
      rootQuestions: [],
      topics: [],
    };
    expect(doc.rootQuestions).toEqual([]);
    expect(doc.topics).toEqual([]);
  });

  it('should allow nested Q and IF nodes', () => {
    const childQuestion: QuestionNode = {
      type: 'question',
      id: 'Q2',
      text: 'Why?',
      children: [],
      lineNumber: 4,
    };

    const ifNode: IfNode = {
      type: 'if',
      answer: '"Yes"',
      children: [childQuestion],
      lineNumber: 3,
    };

    const parentQuestion: QuestionNode = {
      type: 'question',
      id: 'Q1',
      text: 'Did you send the email?',
      children: [ifNode],
      lineNumber: 1,
    };

    expect(parentQuestion.children).toHaveLength(1);
    expect(parentQuestion.children[0].children).toHaveLength(1);
    expect(parentQuestion.children[0].children[0].id).toBe('Q2');
  });
});

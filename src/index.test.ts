import { placeholder } from './index';

describe('placeholder', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should return the package name', () => {
    expect(placeholder()).toBe('markdown-decision-tree');
  });
});

import { describe, expect, it } from 'vitest';

describe('ci proof', () => {
  it('intentionally fails to prove branch protection', () => {
    expect(1).toBe(2);
  });
});

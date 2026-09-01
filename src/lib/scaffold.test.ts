import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Smoke test confirming the Vitest + fast-check harness runs (Task 1).
// Replaced/extended by the pure-logic property tests in later tasks.
describe('test harness', () => {
  it('runs Vitest assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('runs fast-check property checks', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a),
      { numRuns: 100 },
    );
  });
});

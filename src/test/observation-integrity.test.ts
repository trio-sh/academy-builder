import { describe, it, expect } from "vitest";
import {
  generateRandomSeed,
  seededRandom,
  seededShuffle,
} from "@/lib/observationIntegrity";

/**
 * Observation Integrity Tests
 *
 * Build Rules 9, 10, 11 — Verifies the cryptographic seed generation,
 * seeded PRNG, and deterministic shuffle used for scenario randomization.
 */

describe("generateRandomSeed", () => {
  it("should return a positive integer", () => {
    const seed = generateRandomSeed();
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it("should return different seeds on multiple calls", () => {
    const seeds = new Set(Array.from({ length: 10 }, () => generateRandomSeed()));
    // With cryptographic randomness, all 10 seeds should be unique
    expect(seeds.size).toBe(10);
  });
});

describe("seededRandom", () => {
  it("should produce deterministic output for the same seed", () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("should produce different output for different seeds", () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(99);
    const val1 = rng1();
    const val2 = rng2();
    expect(val1).not.toBe(val2);
  });

  it("should produce values between 0 and 1", () => {
    const rng = seededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("should have reasonable distribution", () => {
    const rng = seededRandom(7777);
    const values = Array.from({ length: 1000 }, () => rng());
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    // Mean should be close to 0.5
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});

describe("seededShuffle", () => {
  it("should deterministically shuffle with the same seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = seededShuffle(items, 42);
    const shuffled2 = seededShuffle(items, 42);
    expect(shuffled1).toEqual(shuffled2);
  });

  it("should produce different orderings for different seeds", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = seededShuffle(items, 42);
    const shuffled2 = seededShuffle(items, 99);
    expect(shuffled1).not.toEqual(shuffled2);
  });

  it("should preserve all elements", () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = seededShuffle(items, 42);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("should not mutate the original array", () => {
    const items = [1, 2, 3, 4, 5];
    const original = [...items];
    seededShuffle(items, 42);
    expect(items).toEqual(original);
  });

  it("should handle empty array", () => {
    expect(seededShuffle([], 42)).toEqual([]);
  });

  it("should handle single element array", () => {
    expect(seededShuffle([1], 42)).toEqual([1]);
  });

  it("should actually reorder elements (not identity)", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = seededShuffle(items, 42);
    // With 20 elements, it's extremely unlikely the shuffle is identity
    expect(shuffled).not.toEqual(items);
  });
});

describe("Audit Replay Guarantee", () => {
  it("should reproduce the exact scenario order from a stored seed", () => {
    // Simulate storing a seed and scenario selection for audit
    const scenarios = [
      "scenario_a", "scenario_b", "scenario_c",
      "scenario_d", "scenario_e", "scenario_f",
    ];
    const storedSeed = 123456789;

    // Initial selection
    const originalOrder = seededShuffle(scenarios, storedSeed);

    // Replay (e.g., during an audit)
    const replayedOrder = seededShuffle(scenarios, storedSeed);

    expect(replayedOrder).toEqual(originalOrder);
  });
});

import { BaseSequencer } from "vitest/node";
import type { TestSpecification } from "vitest/node";

// Fixed order: the older scripts count rows in a freshly built database, so they run before the tests that create sources.
export default class DbSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    const first = (f: TestSpecification) => (f.moduleId.includes("legacy-scripts") ? 0 : 1);
    return [...files].sort((a, b) => first(a) - first(b) || a.moduleId.localeCompare(b.moduleId));
  }
}

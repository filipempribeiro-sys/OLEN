/* =========================================================
   OLEN 5.0 — Research Router deterministic contract test
   v0.1.0 — local only, explicit invocation, zero providers
   ========================================================= */
(function (global) {
  'use strict';

  const OLEN5 = global.OLEN5 = global.OLEN5 || {};
  const VERSION = '0.1.0';

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function runCase(name, fn) {
    try {
      fn();
      return { name, ok: true };
    } catch (error) {
      return { name, ok: false, error: String(error && error.message || error) };
    }
  }

  function run() {
    const router = OLEN5.researchRouter;
    if (!router) throw new Error('OLEN5.researchRouter is required');

    const D = router.depth;
    const results = [
      runCase('Existing fresh fact prevents duplicate research', () => {
        const result = router.route({
          needs: [{ field: 'trail.geometry', requiredDepth: D.LIGHT }],
          facts: [{ field: 'trail.geometry', value: [[0, 0]], depth: D.LIGHT, fresh: true }]
        });
        assert(result.shouldResearch === false, 'fresh sufficient fact should be reused');
        assert(result.depth === D.NONE, 'no research should resolve to NONE');
        assert(result.reason === 'facts_sufficient', 'facts should be sufficient');
      }),

      runCase('Stale fact is researched again', () => {
        const result = router.route({
          needs: [{ field: 'weather.current', requiredDepth: D.LIGHT }],
          facts: [{ field: 'weather.current', value: 'sunny', depth: D.LIGHT, fresh: false }]
        });
        assert(result.shouldResearch === true, 'stale fact must not satisfy need');
        assert(result.fields[0] === 'weather.current', 'weather should be missing');
      }),

      runCase('Insufficient fact depth is treated as missing', () => {
        const result = router.route({
          needs: [{ field: 'trip.plan', requiredDepth: D.DEEP }],
          facts: [{ field: 'trip.plan', value: {}, depth: D.LIGHT, fresh: true }]
        });
        assert(result.shouldResearch === true, 'LIGHT fact must not satisfy DEEP need');
        assert(result.depth === D.DEEP, 'research depth should escalate only as required');
      }),

      runCase('Only missing fields are requested', () => {
        const result = router.route({
          needs: [
            { field: 'trail.geometry', requiredDepth: D.LIGHT },
            { field: 'restaurant.opening_hours', requiredDepth: D.STANDARD }
          ],
          facts: [{ field: 'trail.geometry', value: [], depth: D.STANDARD, fresh: true }]
        });
        assert(result.fields.length === 1, 'only one field should be missing');
        assert(result.fields[0] === 'restaurant.opening_hours', 'only opening hours should be researched');
        assert(result.depth === D.STANDARD, 'depth should match missing field');
      }),

      runCase('Highest missing requirement determines depth', () => {
        const result = router.route({
          needs: [
            { field: 'poi.basic', requiredDepth: D.LIGHT },
            { field: 'journey.options', requiredDepth: D.STANDARD },
            { field: 'experience.complex_plan', requiredDepth: D.DEEP }
          ],
          facts: []
        });
        assert(result.depth === D.DEEP, 'highest required missing depth should win');
      }),

      runCase('Budget Guard blocks excessive depth', () => {
        const routed = router.route({
          needs: [{ field: 'experience.complex_plan', requiredDepth: D.DEEP }],
          facts: []
        });
        const guarded = router.budgetGuard(routed, { maxDepth: D.STANDARD });
        assert(guarded.allowed === false, 'DEEP should be blocked by STANDARD budget');
        assert(guarded.reason === 'depth_budget_exceeded', 'budget reason should be explicit');
      }),

      runCase('Budget Guard limits researched fields deterministically', () => {
        const routed = router.route({
          needs: [
            { field: 'a', requiredDepth: D.LIGHT },
            { field: 'b', requiredDepth: D.LIGHT },
            { field: 'c', requiredDepth: D.LIGHT }
          ],
          facts: []
        });
        const guarded = router.budgetGuard(routed, { maxDepth: D.LIGHT, maxFields: 2 });
        assert(guarded.allowed === true, 'research within budget should be allowed');
        assert(guarded.fields.length === 2, 'only two fields should pass');
        assert(guarded.fields[0] === 'a' && guarded.fields[1] === 'b', 'field order must remain deterministic');
        assert(guarded.truncated === true, 'truncation should be visible');
      }),

      runCase('No required needs means zero research', () => {
        const result = router.route({
          needs: [{ field: 'optional.extra', requiredDepth: D.DEEP, required: false }],
          facts: []
        });
        const guarded = router.budgetGuard(result, { maxDepth: D.DEEP });
        assert(result.shouldResearch === false, 'optional-only needs should not trigger research');
        assert(guarded.allowed === true, 'no-research state should pass safely');
        assert(guarded.fields.length === 0, 'no fields should be sent to providers');
      })
    ];

    const passed = results.filter(item => item.ok).length;
    const total = results.length;
    const report = {
      version: VERSION,
      routerVersion: router.version,
      passed,
      total,
      score: `${passed}/${total}`,
      ok: passed === total,
      results
    };

    global.__OLEN5_RESEARCH_TEST_REPORT__ = report;
    return report;
  }

  OLEN5.researchTest = Object.freeze({ version: VERSION, run });
})(window);

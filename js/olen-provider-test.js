/* =========================================================
   OLEN 5.0 — Provider Router deterministic contract test
   v0.1.0 — local only, explicit invocation, zero providers/network
   ========================================================= */
(function (global) {
  'use strict';

  const OLEN5 = global.OLEN5 = global.OLEN5 || {};

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

  function fixtures() {
    return [
      { id: 'official', fields: ['hours', 'price'], maxDepth: 'deep', priority: 10, cost: 0 },
      { id: 'secondary', fields: ['hours', 'weather'], maxDepth: 'standard', priority: 20, cost: 1 },
      { id: 'premium', fields: ['weather', 'availability'], maxDepth: 'deep', priority: 30, cost: 3 },
      { id: 'disabled', fields: ['availability'], maxDepth: 'deep', priority: 1, cost: 0, enabled: false }
    ];
  }

  function run() {
    const router = OLEN5.providerRouter;
    assert(router, 'providerRouter unavailable');

    const results = [
      runCase('Normalizes provider deterministically', () => {
        const p = router.normalizeProvider({ id: ' x ', fields: ['hours', 'hours', ''], priority: '4', cost: -2 });
        assert(p.id === 'x', 'id not normalized');
        assert(p.fields.length === 1 && p.fields[0] === 'hours', 'fields not normalized');
        assert(p.priority === 4 && p.cost === 0, 'numeric values not normalized');
      }),
      runCase('Rejects disabled and insufficient-depth providers', () => {
        assert(router.supports({ id: 'x', fields: ['a'], enabled: false }, 'a', 'light') === false, 'disabled provider accepted');
        assert(router.supports({ id: 'x', fields: ['a'], maxDepth: 'light' }, 'a', 'deep') === false, 'insufficient depth accepted');
      }),
      runCase('Orders eligible providers by priority then cost then id', () => {
        const list = router.eligibleProviders([
          { id: 'b', fields: ['x'], priority: 2, cost: 0 },
          { id: 'c', fields: ['x'], priority: 1, cost: 2 },
          { id: 'a', fields: ['x'], priority: 1, cost: 1 }
        ], 'x', 'light');
        assert(list.map(p => p.id).join(',') === 'a,c,b', 'provider ordering incorrect');
      }),
      runCase('No research route produces no provider work', () => {
        const plan = router.select({ route: { shouldResearch: false, depth: 'none', fields: [] }, providers: fixtures() });
        assert(plan.shouldExecute === false && plan.assignments.length === 0, 'unnecessary work planned');
      }),
      runCase('Selects best provider per requested field', () => {
        const plan = router.select({ route: { shouldResearch: true, depth: 'standard', fields: ['hours', 'weather'] }, providers: fixtures() });
        assert(plan.assignments.length === 2, 'expected two assignments');
        assert(plan.assignments.find(x => x.field === 'hours').providerId === 'official', 'wrong hours provider');
        assert(plan.assignments.find(x => x.field === 'weather').providerId === 'secondary', 'wrong weather provider');
      }),
      runCase('Reports unresolved fields without inventing coverage', () => {
        const plan = router.select({ route: { shouldResearch: true, depth: 'deep', fields: ['hours', 'unknown'] }, providers: fixtures() });
        assert(plan.assignments.length === 1, 'valid assignment missing');
        assert(plan.unresolved.length === 1 && plan.unresolved[0] === 'unknown', 'unresolved field not reported');
        assert(plan.reason === 'partial_provider_coverage', 'partial state not reported');
      }),
      runCase('Cost guard blocks plans above budget', () => {
        const plan = router.select({ route: { shouldResearch: true, depth: 'deep', fields: ['availability'] }, providers: fixtures() });
        const guarded = router.costGuard(plan, { maxCost: 2 });
        assert(guarded.allowed === false, 'over-budget plan allowed');
        assert(guarded.assignments.length === 0, 'blocked assignments leaked');
      }),
      runCase('Cost guard permits zero-cost deterministic plan', () => {
        const plan = router.select({ route: { shouldResearch: true, depth: 'deep', fields: ['hours', 'price'] }, providers: fixtures() });
        const guarded = router.costGuard(plan, { maxCost: 0 });
        assert(guarded.allowed === true && guarded.totalCost === 0, 'zero-cost plan blocked');
        assert(guarded.assignments.length === 2, 'assignments lost');
      })
    ];

    const passed = results.filter(item => item.ok).length;
    const report = { ok: passed === results.length, score: `${passed}/${results.length}`, passed, total: results.length, results };
    global.__OLEN5_PROVIDER_TEST_REPORT__ = report;
    return report;
  }

  OLEN5.providerTest = Object.freeze({ run });
})(window);

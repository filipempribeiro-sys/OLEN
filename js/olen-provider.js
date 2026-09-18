/* =========================================================
   OLEN 5.0 — Provider Router
   Foundation contract v0.1.0
   Select eligible providers deterministically; execute nothing.
   ========================================================= */
(function (global) {
  'use strict';

  const OLEN5 = global.OLEN5 = global.OLEN5 || {};
  const VERSION = '0.1.0';

  const DEPTH_RANK = Object.freeze({ none: 0, light: 1, standard: 2, deep: 3 });

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDepth(value) {
    return Object.prototype.hasOwnProperty.call(DEPTH_RANK, value) ? value : 'light';
  }

  function normalizeProvider(provider) {
    const source = provider && typeof provider === 'object' ? provider : {};
    return {
      id: typeof source.id === 'string' ? source.id.trim() : '',
      enabled: source.enabled !== false,
      fields: Array.isArray(source.fields) ? [...new Set(source.fields.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))] : [],
      maxDepth: normalizeDepth(source.maxDepth || 'deep'),
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 100,
      cost: Number.isFinite(Number(source.cost)) ? Math.max(0, Number(source.cost)) : 0
    };
  }

  function supports(provider, field, depth) {
    const p = normalizeProvider(provider);
    if (!p.id || !p.enabled || !p.fields.includes(field)) return false;
    return DEPTH_RANK[p.maxDepth] >= DEPTH_RANK[normalizeDepth(depth)];
  }

  function eligibleProviders(providers, field, depth) {
    return (Array.isArray(providers) ? providers : [])
      .map(normalizeProvider)
      .filter(provider => supports(provider, field, depth))
      .sort((a, b) => a.priority - b.priority || a.cost - b.cost || a.id.localeCompare(b.id));
  }

  function select(options) {
    const input = options && typeof options === 'object' ? options : {};
    const route = input.route && typeof input.route === 'object' ? input.route : {};
    const fields = Array.isArray(route.fields) ? [...new Set(route.fields.filter(Boolean))] : [];
    const depth = normalizeDepth(route.depth || 'none');

    if (route.allowed === false || route.shouldResearch === false || !fields.length || depth === 'none') {
      return { shouldExecute: false, depth: 'none', assignments: [], unresolved: [], reason: 'no_provider_work_needed' };
    }

    const assignments = [];
    const unresolved = [];

    fields.forEach(field => {
      const candidates = eligibleProviders(input.providers, field, depth);
      if (!candidates.length) {
        unresolved.push(field);
        return;
      }
      assignments.push({ field, providerId: candidates[0].id, depth, cost: candidates[0].cost });
    });

    return {
      shouldExecute: assignments.length > 0,
      depth,
      assignments: clone(assignments),
      unresolved,
      reason: assignments.length ? (unresolved.length ? 'partial_provider_coverage' : 'provider_plan_ready') : 'no_provider_coverage'
    };
  }

  function costGuard(plan, budget) {
    const state = plan && typeof plan === 'object' ? plan : { assignments: [] };
    const assignments = Array.isArray(state.assignments) ? state.assignments : [];
    const maxCost = budget && Number.isFinite(Number(budget.maxCost)) ? Math.max(0, Number(budget.maxCost)) : Infinity;
    const totalCost = assignments.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return {
      allowed: totalCost <= maxCost,
      totalCost,
      maxCost,
      assignments: totalCost <= maxCost ? clone(assignments) : [],
      reason: totalCost <= maxCost ? 'within_cost_budget' : 'cost_budget_exceeded'
    };
  }

  const api = Object.freeze({
    version: VERSION,
    normalizeProvider,
    supports,
    eligibleProviders,
    select,
    costGuard
  });

  OLEN5.providerRouter = api;
})(window);

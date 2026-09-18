/* =========================================================
   OLEN 5.0 — Research Router
   Foundation contract v0.1.0
   Research only what is missing, at the depth required, once.
   ========================================================= */
(function (global) {
  'use strict';

  const OLEN5 = global.OLEN5 = global.OLEN5 || {};
  const VERSION = '0.1.0';

  const DEPTH = Object.freeze({
    NONE: 'none',
    LIGHT: 'light',
    STANDARD: 'standard',
    DEEP: 'deep'
  });

  const DEPTH_RANK = Object.freeze({
    [DEPTH.NONE]: 0,
    [DEPTH.LIGHT]: 1,
    [DEPTH.STANDARD]: 2,
    [DEPTH.DEEP]: 3
  });

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDepth(value) {
    return Object.prototype.hasOwnProperty.call(DEPTH_RANK, value)
      ? value
      : DEPTH.LIGHT;
  }

  function normalizeNeed(need) {
    if (typeof need === 'string') {
      return { field: need, requiredDepth: DEPTH.LIGHT, required: true };
    }

    const source = need && typeof need === 'object' ? need : {};
    return {
      field: typeof source.field === 'string' ? source.field.trim() : '',
      requiredDepth: normalizeDepth(source.requiredDepth),
      required: source.required !== false
    };
  }

  function normalizeFact(fact) {
    const source = fact && typeof fact === 'object' ? fact : {};
    return {
      field: typeof source.field === 'string' ? source.field.trim() : '',
      value: clone(source.value),
      depth: normalizeDepth(source.depth),
      fresh: source.fresh !== false,
      source: source.source || null,
      observedAt: source.observedAt || null
    };
  }

  function factSatisfiesNeed(fact, need) {
    if (!fact || !need || !fact.field || fact.field !== need.field) return false;
    if (!fact.fresh) return false;
    return DEPTH_RANK[fact.depth] >= DEPTH_RANK[need.requiredDepth];
  }

  function missingFacts(needs, facts) {
    const normalizedNeeds = Array.isArray(needs)
      ? needs.map(normalizeNeed).filter(item => item.field && item.required)
      : [];
    const normalizedFacts = Array.isArray(facts)
      ? facts.map(normalizeFact).filter(item => item.field)
      : [];

    return normalizedNeeds.filter(need =>
      !normalizedFacts.some(fact => factSatisfiesNeed(fact, need))
    );
  }

  function requiredDepth(needs) {
    const normalized = Array.isArray(needs)
      ? needs.map(normalizeNeed).filter(item => item.field && item.required)
      : [];

    if (!normalized.length) return DEPTH.NONE;

    return normalized.reduce((highest, need) =>
      DEPTH_RANK[need.requiredDepth] > DEPTH_RANK[highest]
        ? need.requiredDepth
        : highest,
    DEPTH.NONE);
  }

  function route(options) {
    const input = options && typeof options === 'object' ? options : {};
    const missing = missingFacts(input.needs, input.facts);
    const depth = requiredDepth(missing);

    return {
      shouldResearch: missing.length > 0,
      depth,
      missing: clone(missing),
      fields: missing.map(item => item.field),
      reason: missing.length ? 'missing_required_facts' : 'facts_sufficient'
    };
  }

  function budgetGuard(routeResult, budget) {
    const routeState = routeResult && typeof routeResult === 'object'
      ? routeResult
      : { shouldResearch: false, depth: DEPTH.NONE, fields: [] };
    const limits = budget && typeof budget === 'object' ? budget : {};
    const allowedDepth = normalizeDepth(limits.maxDepth || DEPTH.DEEP);
    const maxFields = Number.isFinite(Number(limits.maxFields))
      ? Math.max(0, Number(limits.maxFields))
      : Infinity;

    if (!routeState.shouldResearch) {
      return { allowed: true, depth: DEPTH.NONE, fields: [], reason: 'no_research_needed' };
    }

    if (DEPTH_RANK[routeState.depth] > DEPTH_RANK[allowedDepth]) {
      return { allowed: false, depth: routeState.depth, fields: [], reason: 'depth_budget_exceeded' };
    }

    const fields = Array.isArray(routeState.fields)
      ? routeState.fields.slice(0, maxFields)
      : [];

    return {
      allowed: fields.length > 0,
      depth: routeState.depth,
      fields,
      truncated: Array.isArray(routeState.fields) && fields.length < routeState.fields.length,
      reason: fields.length ? 'within_budget' : 'field_budget_exhausted'
    };
  }

  const api = Object.freeze({
    version: VERSION,
    depth: DEPTH,
    normalizeNeed,
    normalizeFact,
    factSatisfiesNeed,
    missingFacts,
    requiredDepth,
    route,
    budgetGuard
  });

  OLEN5.researchRouter = api;
})(window);

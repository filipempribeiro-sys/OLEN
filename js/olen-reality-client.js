/* =========================================================
   OLEN 5.0 — Reality Client
   Public opaque boundary v0.2.0

   Calls the private Reality API without exposing private scoring,
   evidence fusion, trust weighting or decision internals.
   ========================================================= */
(function (global) {
  'use strict';

  const CONTRACT = 'olen.reality.v1';
  const DEFAULT_PATH = '/api/olen/reality';

  function text(value) { return String(value == null ? '' : value).trim(); }
  function uniqueText(values) { return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))]; }

  function request(input) {
    const value = input && typeof input === 'object' ? input : {};
    return Object.freeze({
      contract: CONTRACT,
      requestId: text(value.requestId),
      experienceId: text(value.experienceId),
      requiredFields: Object.freeze(uniqueText(value.requiredFields)),
      evidence: Object.freeze(Array.isArray(value.evidence) ? value.evidence.slice(0, 100) : [])
    });
  }

  function response(value) {
    const body = value && typeof value === 'object' ? value : {};
    return Object.freeze({
      contract: text(body.contract), requestId: text(body.requestId), experienceId: text(body.experienceId),
      status: text(body.status), complete: body.complete === true,
      confidenceBand: ['low','medium','high'].includes(body.confidenceBand) ? body.confidenceBand : 'low',
      missing: Object.freeze(uniqueText(body.missing)),
      facts: Object.freeze((Array.isArray(body.facts) ? body.facts : []).map(function (fact) {
        return Object.freeze({ field:text(fact&&fact.field), resolved:Boolean(fact&&fact.resolved), value:fact&&fact.resolved?fact.value:null,
          confidenceBand:fact&&['low','medium','high'].includes(fact.confidenceBand)?fact.confidenceBand:'low' });
      }))
    });
  }

  async function evaluate(input, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const fetchFn = opts.fetch || global.fetch;
    if (typeof fetchFn !== 'function') throw new Error('reality_fetch_unavailable');
    const endpoint = text(opts.endpoint) || DEFAULT_PATH;
    const fetchOptions = { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(request(input)) };
    if (opts.signal) fetchOptions.signal = opts.signal;
    const result = await fetchFn(endpoint, fetchOptions);
    if (!result || result.ok !== true) {
      const error = new Error('reality_request_failed');
      error.status = result && Number.isFinite(Number(result.status)) ? Number(result.status) : 0;
      throw error;
    }
    const body = await result.json();
    if (!body || body.contract !== CONTRACT) throw new Error('reality_contract_mismatch');
    return response(body);
  }

  global.OlenReality = Object.freeze({ CONTRACT, DEFAULT_PATH, request, response, evaluate });
})(typeof window !== 'undefined' ? window : globalThis);

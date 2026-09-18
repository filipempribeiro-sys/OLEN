/* =========================================================
   OLEN 5.0 — Reality Live Smoke Harness
   Explicit opt-in only. Never runs on normal shell startup.
   No AI/provider call is requested by this harness; it targets only
   the deterministic private Reality endpoint.
   ========================================================= */
(function (global) {
  'use strict';

  const DEFAULT_BACKEND = 'https://alpha-ai-backend-m6l3.onrender.com';
  const PATH = '/api/olen/reality';

  function text(value) { return String(value == null ? '' : value).trim(); }
  function endpoint(base) { return (text(base) || DEFAULT_BACKEND).replace(/\/+$/, '') + PATH; }

  async function run(options) {
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.confirm !== true) return Object.freeze({ ok:false, skipped:true, reason:'explicit_confirmation_required' });
    const bridge = global.OLEN5 && global.OLEN5.realityBridge;
    if (!bridge) return Object.freeze({ ok:false, skipped:true, reason:'bridge_unavailable' });

    const previous = bridge.state();
    try {
      bridge.configure({ enabled:true, endpoint:endpoint(opts.backend), timeoutMs:opts.timeoutMs || 8000 });
      return await bridge.evaluate({
        requestId:'live-smoke-' + Date.now(),
        experienceId:'olen5-live-smoke',
        requiredFields:['smoke'],
        evidence:[{ id:'smoke-1', field:'smoke', value:true, sourceType:'official', freshness:'live', verified:true, confidence:1 }]
      }, { enabled:true, endpoint:endpoint(opts.backend), timeoutMs:opts.timeoutMs || 8000 });
    } finally {
      bridge.configure(previous);
    }
  }

  global.OLEN5 = global.OLEN5 || {};
  global.OLEN5.realityLiveSmoke = Object.freeze({ DEFAULT_BACKEND, PATH, endpoint, run });
})(typeof window !== 'undefined' ? window : globalThis);

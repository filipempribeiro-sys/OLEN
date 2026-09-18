/* =========================================================
   OLEN 5.0 — Reality Bridge
   Public integration boundary v0.1.0

   Fail-safe bridge between OLEN shell modules and the opaque Reality
   client. Disabled by default. No private scoring/fusion logic here.
   ========================================================= */
(function (global) {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 4000;
  let config = Object.freeze({ enabled: false, endpoint: '', timeoutMs: DEFAULT_TIMEOUT_MS });

  function text(value) { return String(value == null ? '' : value).trim(); }
  function boundedTimeout(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_TIMEOUT_MS;
    return Math.max(250, Math.min(10000, Math.round(number)));
  }

  function configure(options) {
    const value = options && typeof options === 'object' ? options : {};
    config = Object.freeze({
      enabled: value.enabled === true,
      endpoint: text(value.endpoint),
      timeoutMs: boundedTimeout(value.timeoutMs)
    });
    return config;
  }

  function state() { return config; }

  function unavailable(reason) {
    return Object.freeze({ ok: false, skipped: true, reason: reason, reality: null });
  }

  async function evaluate(input, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const current = Object.assign({}, config, opts);
    if (current.enabled !== true) return unavailable('disabled');
    if (!global.OlenReality || typeof global.OlenReality.evaluate !== 'function') return unavailable('client_unavailable');

    const timeoutMs = boundedTimeout(current.timeoutMs);
    let timer = null;
    let controller = null;
    if (typeof global.AbortController === 'function') controller = new global.AbortController();

    try {
      const realityPromise = global.OlenReality.evaluate(input, {
        endpoint: text(current.endpoint) || global.OlenReality.DEFAULT_PATH,
        fetch: current.fetch || global.fetch,
        signal: controller ? controller.signal : undefined
      });
      const timeoutPromise = new Promise(function (_, reject) {
        timer = global.setTimeout(function () {
          if (controller) controller.abort();
          reject(new Error('reality_timeout'));
        }, timeoutMs);
      });
      const reality = await Promise.race([realityPromise, timeoutPromise]);
      return Object.freeze({ ok: true, skipped: false, reason: '', reality: reality });
    } catch (error) {
      return Object.freeze({
        ok: false,
        skipped: false,
        reason: error && error.message ? error.message : 'reality_failed',
        reality: null
      });
    } finally {
      if (timer != null) global.clearTimeout(timer);
    }
  }

  global.OLEN5 = global.OLEN5 || {};
  global.OLEN5.realityBridge = Object.freeze({ DEFAULT_TIMEOUT_MS, configure, state, evaluate });
})(typeof window !== 'undefined' ? window : globalThis);

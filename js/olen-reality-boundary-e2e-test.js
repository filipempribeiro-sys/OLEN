/* =========================================================
   OLEN 5.0 — Reality Public/Private Boundary E2E
   Controlled transport: no network, Render, AI or provider calls.
   ========================================================= */
(function (global) {
  'use strict';

  function assert(condition, message) { if (!condition) throw new Error(message || 'assertion_failed'); }
  function equal(a, b, message) { assert(a === b, message || (String(a) + ' !== ' + String(b))); }

  async function run() {
    const bridge = global.OLEN5 && global.OLEN5.realityBridge;
    const client = global.OlenReality;
    const results = [];
    async function test(name, fn) {
      try { await fn(); results.push({ name: name, ok: true }); }
      catch (error) { results.push({ name: name, ok: false, error: error && error.message ? error.message : String(error) }); }
    }

    function transport(body, status) {
      return async function (url, options) {
        equal(url, '/api/olen/reality');
        equal(options.method, 'POST');
        const request = JSON.parse(options.body);
        equal(request.contract, 'olen.reality.v1');
        return {
          ok: (status || 200) >= 200 && (status || 200) < 300,
          status: status || 200,
          json: async function () { return body; }
        };
      };
    }

    await test('Disabled bridge performs zero transport calls', async function () {
      let calls = 0; bridge.configure({ enabled: false });
      const result = await bridge.evaluate({}, { fetch: async function () { calls += 1; } });
      equal(calls, 0); equal(result.skipped, true); equal(result.reason, 'disabled');
    });

    await test('Bridge and client preserve Reality v1 correlation IDs', async function () {
      bridge.configure({ enabled: true });
      const body = { contract:'olen.reality.v1', requestId:'r-e2e', experienceId:'x-e2e', status:'supported', complete:true, confidenceBand:'high', missing:[], facts:[] };
      const result = await bridge.evaluate({ requestId:'r-e2e', experienceId:'x-e2e', requiredFields:['open'], evidence:[] }, { fetch: transport(body) });
      equal(result.ok, true); equal(result.reality.requestId, 'r-e2e'); equal(result.reality.experienceId, 'x-e2e');
    });

    await test('Supported private response crosses boundary as safe DTO', async function () {
      const body = { contract:'olen.reality.v1', status:'supported', complete:true, confidenceBand:'high', confidence:0.99, missing:[], facts:[{ field:'open', resolved:true, value:true, confidenceBand:'high', confidence:0.99, selectedEvidenceId:'private' }] };
      const result = await bridge.evaluate({ requiredFields:['open'], evidence:[] }, { enabled:true, fetch:transport(body) });
      equal(result.reality.status, 'supported'); equal(result.reality.facts[0].value, true);
      equal(result.reality.confidence, undefined); equal(result.reality.facts[0].confidence, undefined); equal(result.reality.facts[0].selectedEvidenceId, undefined);
    });

    await test('Insufficient evidence remains fail-safe and low confidence', async function () {
      const body = { contract:'olen.reality.v1', status:'insufficient_evidence', complete:false, confidenceBand:'low', missing:['hours'], facts:[{ field:'hours', resolved:false, value:null, confidenceBand:'low' }] };
      const result = await bridge.evaluate({ requiredFields:['hours'], evidence:[] }, { enabled:true, fetch:transport(body) });
      equal(result.ok, true); equal(result.reality.complete, false); equal(result.reality.confidenceBand, 'low'); equal(result.reality.missing[0], 'hours');
    });

    await test('HTTP boundary failure is contained by bridge', async function () {
      const result = await bridge.evaluate({ requiredFields:['open'], evidence:[] }, { enabled:true, fetch:transport({ contract:'olen.reality.v1', status:'invalid_request', error:'too_much_evidence' }, 413) });
      equal(result.ok, false); equal(result.skipped, false); equal(result.reason, 'reality_request_failed');
    });

    await test('Contract mismatch is blocked before shell consumption', async function () {
      const result = await bridge.evaluate({}, { enabled:true, fetch:async function () { return { ok:true, status:200, json:async function () { return { contract:'olen.reality.v0' }; } }; } });
      equal(result.ok, false); equal(result.reason, 'reality_contract_mismatch');
    });

    await test('Unknown private fields cannot cross the public client surface', async function () {
      const body = { contract:'olen.reality.v1', status:'supported', complete:true, confidenceBand:'high', weights:{official:999}, antiFraud:{score:1}, evidenceIds:['e1'], missing:[], facts:[] };
      const result = await bridge.evaluate({}, { enabled:true, fetch:transport(body) });
      equal(result.reality.weights, undefined); equal(result.reality.antiFraud, undefined); equal(result.reality.evidenceIds, undefined);
    });

    await test('Controlled E2E leaves bridge disabled after validation', async function () {
      bridge.configure({ enabled:false });
      equal(bridge.state().enabled, false);
      equal(client.CONTRACT, 'olen.reality.v1');
    });

    bridge.configure({ enabled:false });
    const passed = results.filter(function (item) { return item.ok; }).length;
    return Object.freeze({ ok:passed===results.length, score:passed+'/'+results.length, passed:passed, total:results.length, results:Object.freeze(results) });
  }

  global.OLEN5 = global.OLEN5 || {};
  global.OLEN5.realityBoundaryE2ETest = Object.freeze({ run:run });
})(typeof window !== 'undefined' ? window : globalThis);

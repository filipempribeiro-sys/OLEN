/* =========================================================
   OLEN 5.0 — Mobility Router deterministic contract test
   v0.1.0 — local only, explicit invocation
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
    const router = OLEN5.mobilityRouter;
    if (!router) throw new Error('OLEN5.mobilityRouter is required');

    const M = router.modes;
    const P = router.preference;

    const profile = {
      preferences: {
        [M.WALK]: P.HABITUAL,
        [M.CAR]: P.HABITUAL,
        [M.TRAIN]: P.CONTEXTUAL,
        [M.BUS]: P.CONTEXTUAL,
        [M.MOTORHOME]: P.EXCEPTIONAL,
        [M.BOAT_CONTEXT]: P.INACTIVE
      },
      vehicles: {
        motorhome: { height: 3.1, width: 2.3, length: 7.2, weight: 3500 }
      }
    };

    const results = [
      runCase('Habitual feasible mode is preferred', () => {
        const result = router.resolve({
          profile,
          candidates: [M.TRAIN, M.WALK]
        });
        assert(result.selectedMode === M.WALK, 'walk should win over contextual train');
        assert(result.selectedPreference === P.HABITUAL, 'selected preference should be habitual');
      }),

      runCase('Viability overrides habitual preference', () => {
        const result = router.resolve({
          profile,
          candidates: [M.CAR, M.TRAIN],
          constraints: { unavailableModes: [M.CAR] }
        });
        assert(result.selectedMode === M.TRAIN, 'train should be selected when habitual car is unavailable');
      }),

      runCase('Minimum necessary preference change is respected', () => {
        const result = router.resolve({
          profile,
          candidates: [M.MOTORHOME, M.TRAIN, M.BOAT_CONTEXT],
          constraints: { unavailableModes: [M.TRAIN] }
        });
        assert(result.selectedMode === M.MOTORHOME, 'exceptional motorhome should win over inactive boat context');
        assert(result.selectedPreference === P.EXCEPTIONAL, 'preference should be exceptional');
      }),

      runCase('Equal viable preferences expose user choice', () => {
        const result = router.resolve({
          profile,
          candidates: [M.TRAIN, M.BUS]
        });
        assert(result.selectedMode === M.TRAIN, 'candidate order should remain deterministic');
        assert(result.needsUserChoice === true, 'equal preference alternatives should expose choice');
        assert(result.alternatives[0] === M.BUS, 'bus should remain an alternative');
      }),

      runCase('Multimodal segments resolve independently', () => {
        const segments = router.resolveSegments([
          {
            id: 'home-station',
            candidates: [M.CAR, M.WALK],
            constraints: { unavailableModes: [M.CAR] }
          },
          {
            id: 'station-destination',
            candidates: [M.TRAIN, M.BUS]
          }
        ], profile);
        assert(segments.length === 2, 'two segments expected');
        assert(segments[0].mobility.selectedMode === M.WALK, 'first segment should walk');
        assert(segments[1].mobility.selectedMode === M.TRAIN, 'second segment should deterministically select train');
      }),

      runCase('Vehicle dimensions reject incompatible terrestrial route', () => {
        const vehicle = profile.vehicles.motorhome;
        assert(router.vehicleCompatible(M.MOTORHOME, vehicle, { maxHeight: 3.5, maxWeight: 4000 }) === true,
          'vehicle should fit permissive limits');
        assert(router.vehicleCompatible(M.MOTORHOME, vehicle, { maxHeight: 2.8, maxWeight: 4000 }) === false,
          'vehicle should fail height limit');
      }),

      runCase('Boat and aviation remain contextual modes, not navigation engines', () => {
        const boat = router.resolve({
          profile: { preferences: { [M.BOAT_CONTEXT]: P.CONTEXTUAL } },
          candidates: [M.BOAT_CONTEXT]
        });
        const aviation = router.resolve({
          profile: { preferences: { [M.PRIVATE_AVIATION_CONTEXT]: P.CONTEXTUAL } },
          candidates: [M.PRIVATE_AVIATION_CONTEXT]
        });
        assert(boat.selectedMode === M.BOAT_CONTEXT, 'boat context should be representable');
        assert(aviation.selectedMode === M.PRIVATE_AVIATION_CONTEXT, 'private aviation context should be representable');
      }),

      runCase('No feasible mode fails safely without inventing transport', () => {
        const result = router.resolve({
          profile,
          candidates: [M.CAR, M.TRAIN],
          constraints: { unavailableModes: [M.CAR, M.TRAIN] }
        });
        assert(result.selectedMode === null, 'selected mode must be null');
        assert(result.reason === 'no_feasible_mode', 'reason should explain no feasible mode');
        assert(result.feasibleModes.length === 0, 'no feasible modes should remain');
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

    global.__OLEN5_MOBILITY_TEST_REPORT__ = report;
    return report;
  }

  OLEN5.mobilityTest = Object.freeze({ version: VERSION, run });
})(window);

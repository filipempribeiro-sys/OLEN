/* =========================================================
   OLEN 5.0 — Mobility Router
   Foundation contract v0.1.0
   ========================================================= */
(function (global) {
  'use strict';

  const OLEN5 = global.OLEN5 = global.OLEN5 || {};
  const VERSION = '0.1.0';

  const MODES = Object.freeze({
    WALK: 'walk',
    BIKE: 'bike',
    SCOOTER: 'scooter',
    MOTORCYCLE: 'motorcycle',
    CAR: 'car',
    MOTORHOME: 'motorhome',
    TRAILER: 'trailer',
    BUS: 'bus',
    TRAIN: 'train',
    METRO: 'metro',
    FERRY: 'ferry',
    COMMERCIAL_FLIGHT: 'commercial_flight',
    BOAT_CONTEXT: 'boat_context',
    PRIVATE_AVIATION_CONTEXT: 'private_aviation_context'
  });

  const PREFERENCE = Object.freeze({
    HABITUAL: 'habitual',
    CONTEXTUAL: 'contextual',
    EXCEPTIONAL: 'exceptional',
    INACTIVE: 'inactive'
  });

  const ALL_MODES = new Set(Object.values(MODES));
  const ALL_PREFERENCES = new Set(Object.values(PREFERENCE));

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeMode(mode) {
    return ALL_MODES.has(mode) ? mode : null;
  }

  function normalizePreference(value) {
    return ALL_PREFERENCES.has(value) ? value : PREFERENCE.INACTIVE;
  }

  function normalizeProfile(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};
    const preferences = {};

    for (const mode of ALL_MODES) {
      preferences[mode] = normalizePreference(source.preferences && source.preferences[mode]);
    }

    const vehicles = source.vehicles && typeof source.vehicles === 'object'
      ? clone(source.vehicles)
      : {};

    return { preferences, vehicles };
  }

  function rankPreference(preference) {
    switch (preference) {
      case PREFERENCE.HABITUAL: return 0;
      case PREFERENCE.CONTEXTUAL: return 1;
      case PREFERENCE.EXCEPTIONAL: return 2;
      case PREFERENCE.INACTIVE: return 3;
      default: return 4;
    }
  }

  function isFeasible(mode, constraints) {
    const c = constraints && typeof constraints === 'object' ? constraints : {};
    const unavailable = Array.isArray(c.unavailableModes) ? c.unavailableModes : [];
    const required = Array.isArray(c.requiredModes) ? c.requiredModes : [];

    if (unavailable.includes(mode)) return false;
    if (required.length && !required.includes(mode)) return false;
    return true;
  }

  function resolve(options) {
    const input = options && typeof options === 'object' ? options : {};
    const profile = normalizeProfile(input.profile);
    const constraints = input.constraints && typeof input.constraints === 'object'
      ? clone(input.constraints)
      : {};
    const requestedModes = Array.isArray(input.candidates)
      ? input.candidates.map(normalizeMode).filter(Boolean)
      : Array.from(ALL_MODES);

    const uniqueCandidates = [...new Set(requestedModes)];
    const feasible = uniqueCandidates.filter(mode => isFeasible(mode, constraints));

    const ranked = feasible
      .map((mode, index) => ({
        mode,
        preference: profile.preferences[mode],
        preferenceRank: rankPreference(profile.preferences[mode]),
        inputOrder: index
      }))
      .sort((a, b) =>
        a.preferenceRank - b.preferenceRank || a.inputOrder - b.inputOrder
      );

    const selected = ranked.length ? ranked[0] : null;

    return {
      selectedMode: selected ? selected.mode : null,
      selectedPreference: selected ? selected.preference : null,
      feasibleModes: ranked.map(item => item.mode),
      alternatives: ranked.slice(1).map(item => item.mode),
      needsUserChoice: ranked.length > 1 && ranked[0].preferenceRank === ranked[1].preferenceRank,
      constraints,
      reason: selected
        ? 'preferred_feasible_mode'
        : 'no_feasible_mode'
    };
  }

  function resolveSegments(segments, profile) {
    if (!Array.isArray(segments)) return [];

    return segments.map((segment, index) => {
      const source = segment && typeof segment === 'object' ? segment : {};
      return {
        id: source.id || `segment-${index + 1}`,
        from: clone(source.from || null),
        to: clone(source.to || null),
        mobility: resolve({
          profile,
          candidates: source.candidates,
          constraints: source.constraints
        })
      };
    });
  }

  function vehicleCompatible(mode, vehicle, limits) {
    if (![MODES.CAR, MODES.MOTORHOME, MODES.TRAILER].includes(mode)) return true;
    if (!vehicle || !limits) return true;

    const checks = [
      ['height', 'maxHeight'],
      ['width', 'maxWidth'],
      ['length', 'maxLength'],
      ['weight', 'maxWeight']
    ];

    return checks.every(([vehicleKey, limitKey]) => {
      const value = Number(vehicle[vehicleKey]);
      const limit = Number(limits[limitKey]);
      if (!Number.isFinite(value) || !Number.isFinite(limit)) return true;
      return value <= limit;
    });
  }

  const api = Object.freeze({
    version: VERSION,
    modes: MODES,
    preference: PREFERENCE,
    normalizeProfile,
    resolve,
    resolveSegments,
    vehicleCompatible
  });

  OLEN5.mobilityRouter = api;
})(window);

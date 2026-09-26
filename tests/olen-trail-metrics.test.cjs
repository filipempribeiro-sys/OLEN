const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate}=require('../js/olen-trail-metrics.js');
test('elevation metrics remain unknown without samples',()=>{const x=calculate([[{},{}]]);assert.equal(x.ascentMeters,null);assert.equal(x.difficulty.status,'unknown')});
test('ascending descending and minimum maximum elevations',()=>{const x=calculate([[{elevation:100},{elevation:110},{elevation:90}]]);assert.equal(x.ascentMeters,10);assert.equal(x.descentMeters,20);assert.equal(x.maxElevationMeters,110);assert.equal(x.minElevationMeters,90)});
test('small changes are not counted as ascent',()=>{const x=calculate([[{elevation:100},{elevation:101},{elevation:102}]]);assert.equal(x.ascentMeters,0)});
test('separate GPX segments are not joined for elevation gains',()=>{const x=calculate([[{elevation:100}],[{elevation:150}]]);assert.equal(x.ascentMeters,0)});

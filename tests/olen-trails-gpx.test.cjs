const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,exportTrack,geometry}=require('../js/olen-trails-gpx.js');
test('GPX export escapes names and preserves recorded coordinates',()=>{
 const xml=exportTrack({name:'Trilho & <Mar>',points:[{latitude:38.72,longitude:-9.13,timestamp:1000,elevation:23}]});
 assert.match(xml,/Trilho &amp; &lt;Mar&gt;/);
 assert.match(xml,/lat="38.72" lon="-9.13"/);
 assert.match(xml,/<ele>23<\/ele>/);
 assert.match(xml,/1970-01-01T00:00:01.000Z/);
});
test('GPX export rejects missing or invalid coordinates',()=>{
 assert.throws(()=>exportTrack({points:[]}));
 assert.throws(()=>exportTrack({points:[{latitude:91,longitude:0}]}));
});
test('GPX parser rejects external entity declarations before XML parsing',()=>{
 assert.throws(()=>parse('<!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx/>'),/externas/);
});
test('GPX geometry preserves disjoint segments',()=>{
 const data={segments:[[{latitude:38,longitude:-9},{latitude:38.1,longitude:-9}], [{latitude:39,longitude:-8}]]};
 const geo=geometry(data);
 assert.equal(geo.type,'MultiLineString');assert.equal(geo.coordinates.length,2);
 assert.deepEqual(geo.coordinates[0][0],[-9,38]);
});
test('single segment is a GeoJSON LineString',()=>{
 assert.equal(geometry({segments:[[{latitude:38,longitude:-9}]]}).type,'LineString');
});

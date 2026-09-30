const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-cloudflare-chat.js'),'utf8');
function boot(){
 const nodes=new Map();let callbacks=null,executions=0;
 const window={turnstile:{render:(target,options)=>{callbacks=options;return 'test-widget'},reset(){},execute(){executions++}}};
 const document={getElementById:id=>nodes.get(id),createElement:()=>({style:{},setAttribute(){}}),body:{appendChild:n=>nodes.set(n.id,n)},head:{appendChild(){}}};
 vm.runInNewContext(source,{window,document,setTimeout:()=>1,clearTimeout(){},console});
 return {api:window.OLENCloudflareChat,nodes,get callbacks(){return callbacks},get executions(){return executions}};
}
test('successful challenge disappears immediately and the next request still executes security',async()=>{
 const h=boot(),pending=h.api.getTurnstileToken();await Promise.resolve();
 const target=h.nodes.get('olen-chat-turnstile');assert.equal(target.hidden,false);
 h.callbacks.callback('valid-test-token');assert.equal(await pending,'valid-test-token');assert.equal(target.hidden,true);assert.equal(target.style.display,'none');
 const second=h.api.getTurnstileToken();await Promise.resolve();assert.equal(target.hidden,false);assert.equal(target.style.display,'');assert.equal(h.executions,2);
 h.callbacks.callback('second-test-token');await second;assert.equal(target.hidden,true);
});
test('failed verification does not leave a permanent overlay',async()=>{
 const h=boot(),pending=h.api.getTurnstileToken();await Promise.resolve();h.callbacks['error-callback']();await assert.rejects(pending,/validar a segurança/);assert.equal(h.nodes.get('olen-chat-turnstile').style.display,'none');
});


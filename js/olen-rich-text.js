(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OLENRichText=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function inline(value){const out=[],r=/\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;let last=0,m;while((m=r.exec(value))){if(m.index>last)out.push({text:value.slice(last,m.index)});if(m[1])out.push({text:m[1],bold:true});else out.push({text:m[2],url:m[3]});last=r.lastIndex;}if(last<value.length)out.push({text:value.slice(last)});return out;}
 function blocks(value){return String(value||'').split(/\r?\n/).map(line=>{const heading=/^(#{1,3})\s+(.*)$/.exec(line),list=/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);return {type:heading?'heading':list?'list':line.trim()?'paragraph':'space',text:heading?heading[2]:list?list[1]:line};});}
 function html(value){return blocks(value).map(b=>b.type==='space'?'<div style="height:8px"></div>':'<div style="'+(b.type==='heading'?'font-weight:700;margin:12px 0 6px;':b.type==='list'?'padding-left:14px;margin:5px 0;':'margin:4px 0;')+'">'+(b.type==='list'?'• ':'')+inline(b.text).map(p=>p.bold?'<strong>'+esc(p.text)+'</strong>':p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.text)+'</a>':esc(p.text)).join('')+'</div>').join('');}
 return {blocks,inline,html};
});

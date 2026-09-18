/* OLEN 5.0 - CHAT
   Single owner for Chat view, compose/fullscreen state, conversation selection,
   sidebar/scrim lifecycle and search state.
   No legacy ALPHA/OLEN 4.x dependency.
   Intentionally not loaded by the OLEN 4.x runtime yet.
*/
(()=>{
'use strict';
const ROOT=window.OLEN5,core=ROOT?.core,router=ROOT?.router;
if(!core||!router)throw new Error('OLEN 5.0 Chat requires core and router');
if(ROOT.chat?.version==='5.0.0')return;
const VERSION='5.0.0',SIDEBAR_OVERLAY='chat-sidebar',SEARCH_OVERLAY='chat-search';
let initialized=false,mounted=false,unregister=null,overlayOff=null,conversations=[],searchQuery='';
let selectors={root:'#lifestyleAI',thread:'.lifestyleThread',composer:'.lifestyleComposer'};
function host(){return core.qs(selectors.root)}
function thread(){return core.qs(selectors.thread,host()||document)}
function composer(){return core.qs(selectors.composer,host()||document)}
function normalizeText(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function cloneConversation(item){return{id:String(item?.id||''),title:String(item?.title||'Nova conversa'),createdAt:item?.createdAt||null,updatedAt:item?.updatedAt||null,messages:Array.isArray(item?.messages)?item.messages.map(message=>({...message})):[]}}
function activeId(){return core.state.chat?.conversationId||null}
function activeConversation(){const id=activeId();return id?conversations.find(item=>item.id===id)||null:null}
function hasConversation(){const current=activeConversation();return!!(current&&current.messages.length)}
function mode(){const chat=core.state.chat||{};if(chat.sidebar)return'sidebar';if(chat.compose&&!hasConversation())return'compose';if(hasConversation())return'conversation';return'compose'}
function syncState(patch,meta={}){core.setState(draft=>{draft.chat={...(draft.chat||{}),...patch}},{source:'chat',...meta})}
function render(reason='render'){
  if(!mounted)return false;const h=host();if(!h)return false;const currentMode=mode();
  document.documentElement.dataset.olenView='chat';document.documentElement.dataset.olenChatMode=currentMode;
  h.dataset.olenMounted='5.0';h.dataset.olenChatOwner='5.0';h.dataset.olenChatMode=currentMode;
  const t=thread(),c=composer();if(t)t.dataset.olenChatThread='5.0';if(c)c.dataset.olenChatComposer='5.0';
  core.emit('chat:rendered',{reason,mode:currentMode,conversationId:activeId(),sidebar:!!core.state.chat?.sidebar});return true;
}
function mount(context={}){mounted=true;core.raf2(()=>render(context.reason||'enter-chat'));core.emit('chat:mounted',{context});return true}
function clearPresentation(){const h=host();h?.removeAttribute('data-olen-mounted');h?.removeAttribute('data-olen-chat-owner');h?.removeAttribute('data-olen-chat-mode');thread()?.removeAttribute('data-olen-chat-thread');composer()?.removeAttribute('data-olen-chat-composer');delete document.documentElement.dataset.olenChatMode}
function unmount(context={}){if(!mounted)return;closeSidebar('leave-chat');closeSearch('leave-chat');mounted=false;clearPresentation();core.emit('chat:unmounted',{context})}
function setConversations(items,{preserveSelection=true}={}){conversations=Array.isArray(items)?items.map(cloneConversation).filter(item=>item.id):[];const selected=preserveSelection?activeId():null;if(selected&&!conversations.some(item=>item.id===selected))syncState({conversationId:null,compose:true},{action:'conversation:selection-cleared'});core.emit('chat:conversations',{count:conversations.length});if(mounted)render('conversations-update');return conversations.length}
function openConversation(id,{enter=true}={}){const key=String(id||''),found=conversations.find(item=>item.id===key);if(!found)return false;closeSidebar('open-conversation');closeSearch('open-conversation');syncState({conversationId:key,compose:false},{action:'conversation:open',conversationId:key});if(enter&&router.current!=='chat')router.enter('chat',{reason:'open-conversation'});else if(mounted)render('open-conversation');core.emit('chat:conversation-opened',{conversationId:key});return true}
function startFresh({enter=true,focus=false}={}){closeSidebar('new-chat');closeSearch('new-chat');syncState({conversationId:null,compose:true},{action:'conversation:new'});if(enter&&router.current!=='chat')router.enter('chat',{reason:'new-chat'});else if(mounted)render('new-chat');if(focus)core.raf2(()=>composer()?.querySelector('textarea,input,[contenteditable="true"]')?.focus());core.emit('chat:new-conversation',{});return true}
function upsertConversation(item){const next=cloneConversation(item);if(!next.id)return false;const index=conversations.findIndex(current=>current.id===next.id);if(index>=0)conversations.splice(index,1,next);else conversations.unshift(next);core.emit('chat:conversation-upserted',{conversationId:next.id});if(mounted&&activeId()===next.id)render('conversation-update');return true}
function deleteConversation(id){const key=String(id||''),index=conversations.findIndex(item=>item.id===key);if(index<0)return false;conversations.splice(index,1);if(activeId()===key)syncState({conversationId:null,compose:true},{action:'conversation:deleted',conversationId:key});core.emit('chat:conversation-deleted',{conversationId:key});if(mounted)render('conversation-delete');return true}
function renameConversation(id,title){const key=String(id||''),item=conversations.find(current=>current.id===key);if(!item)return false;item.title=String(title||'').trim()||'Nova conversa';item.updatedAt=new Date().toISOString();core.emit('chat:conversation-renamed',{conversationId:key,title:item.title});if(mounted)render('conversation-rename');return true}
function searchConversations(query=searchQuery){searchQuery=String(query||'').trim();const needle=normalizeText(searchQuery),sorted=[...conversations].sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));if(!needle)return sorted;return sorted.filter(item=>normalizeText([item.title,...item.messages.map(message=>message?.text||'')].join('\n')).includes(needle))}
function openSidebar(){if(router.current!=='chat')return false;closeSearch('sidebar-open');router.setOverlay(SIDEBAR_OVERLAY);searchQuery='';if(mounted)render('sidebar-open');core.emit('chat:sidebar-opened',{});return true}
function closeSidebar(reason='sidebar-close'){if(core.state.overlay?.name!==SIDEBAR_OVERLAY&&!core.state.chat?.sidebar)return false;router.closeOverlay(reason);if(mounted)render(reason);core.emit('chat:sidebar-closed',{reason});return true}
function toggleSidebar(){return core.state.chat?.sidebar?closeSidebar('sidebar-toggle'):openSidebar()}
function openSearch(query=''){if(router.current!=='chat')return false;closeSidebar('search-open');searchQuery=String(query||'');router.setOverlay(SEARCH_OVERLAY,{query:searchQuery});core.emit('chat:search-opened',{query:searchQuery,results:searchConversations(searchQuery)});return true}
function closeSearch(reason='search-close'){if(core.state.overlay?.name!==SEARCH_OVERLAY)return false;router.closeOverlay(reason);searchQuery='';core.emit('chat:search-closed',{reason});return true}
function setSearchQuery(query){searchQuery=String(query||'');const results=searchConversations(searchQuery);if(core.state.overlay?.name===SEARCH_OVERLAY)router.setOverlay(SEARCH_OVERLAY,{query:searchQuery});core.emit('chat:search-results',{query:searchQuery,results});return results}
function init(options={}){
  if(initialized)return ROOT.chat;initialized=true;selectors={...selectors,...(options.selectors||{})};if(Array.isArray(options.conversations))setConversations(options.conversations,{preserveSelection:false});
  unregister=router.registerView('chat',{enter:mount,leave:unmount,afterEnter:context=>core.emit('chat:ready',{context,mode:mode()})});
  overlayOff=core.on('overlay:closed',()=>{if(mounted)core.raf(()=>render('overlay-closed'))});
  core.emit('chat:registered',{version:VERSION});return ROOT.chat;
}
function destroy(){overlayOff?.();overlayOff=null;unregister?.();unregister=null;unmount({reason:'destroy'});conversations=[];searchQuery='';initialized=false}
ROOT.chat=Object.freeze({version:VERSION,init,destroy,mount,unmount,render,setConversations,upsertConversation,deleteConversation,renameConversation,openConversation,startFresh,searchConversations,openSidebar,closeSidebar,toggleSidebar,openSearch,closeSearch,setSearchQuery,get mounted(){return mounted},get mode(){return mode()},get conversation(){return activeConversation()},get conversationId(){return activeId()},get sidebarOpen(){return!!core.state.chat?.sidebar},get conversations(){return conversations.map(cloneConversation)}});
core.register('chat',ROOT.chat);
})();
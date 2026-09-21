/* OLEN Chat Clean V2 — shell lifecycle bridge.
   The Clean V2 runtime owns all Chat UI/state. This file only satisfies the OLEN shell lifecycle contract. */
(()=>{"use strict";
const ROOT=window.OLEN5,core=ROOT?.core,router=ROOT?.router;
if(!ROOT||!core||!router)throw new Error("OLEN Chat shell bridge requires core and router");
if(ROOT.chat?.version==="clean-v2-shell-1.0.0")return;
let initialized=false,mounted=false,unregister=null;
function root(){return document.querySelector('[data-screen="chat"]')}
function clean(){return window.OLENChatClean}
function mount(context={}){mounted=true;document.body.classList.add("olen-chat-route");const host=root();if(host)host.dataset.olenChatOwner="clean-v2";clean()?.render?.();core.emit("chat:mounted",{owner:"clean-v2",context});return true}
function unmount(context={}){if(!mounted)return false;clean()?.closeSidebar?.();clean()?.stopGeneration?.();document.body.classList.remove("olen-chat-route");root()?.removeAttribute("data-olen-chat-owner");mounted=false;core.emit("chat:unmounted",{owner:"clean-v2",context});return true}
function init(){if(initialized)return ROOT.chat;initialized=true;unregister=router.registerView("chat",{enter:mount,leave:unmount,afterEnter:context=>core.emit("chat:ready",{owner:"clean-v2",context})});core.emit("chat:registered",{version:"clean-v2-shell-1.0.0",owner:"clean-v2"});return ROOT.chat}
function destroy(){unmount({reason:"destroy"});unregister?.();unregister=null;initialized=false;return true}
ROOT.chat=Object.freeze({version:"clean-v2-shell-1.0.0",init,destroy,mount,unmount,render:()=>clean()?.render?.(),startFresh:()=>clean()?.newConversation?.(),openSidebar:()=>clean()?.openSidebar?.(),closeSidebar:()=>clean()?.closeSidebar?.(),get mounted(){return mounted}});
core.register("chat",ROOT.chat);
})();
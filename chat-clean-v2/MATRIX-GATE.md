# Chat Clean V2 — Matrix Gate

## Static structure
- [x] Core DOM present with no duplicate IDs.
- [x] Correct OLEN rail asset.
- [x] Correct Nova conversa composition SVG.
- [x] Real SVG navigation: Início / Mapa / Chat / Agenda / Perfil.
- [x] Imagens / Biblioteca / Projetos-Planos / Agendados.
- [x] Afixados / Recentes / Ver todas.
- [x] Search, long menu, general menu, message-more menu, useful prompt.

## Behavior implemented
- [x] conversation persistence and active conversation.
- [x] new conversation and automatic title.
- [x] 500 ms long press.
- [x] Fixar / Desafixar / Renomear / Eliminar.
- [x] search title, messages and attachment filenames.
- [x] multiple attachments and removal.
- [x] SpeechRecognition pt-PT.
- [x] tone persistence.
- [x] Conversation Engine request / stop / fail.
- [x] copy / share / retry / thumbs feedback / message more.
- [x] periodic useful prompt and persistence.
- [x] sidebar tool action bridge plus direct compatible shell targets.
- [x] card Ver detalhes action event.
- [x] card Ver no mapa navigation.
- [x] rail main navigation routed through OLEN router with shell fallback.
- [x] general menu Início routed through same navigation bridge.

## Static audit
- Duplicate static IDs: 0.
- The only JS-referenced ID not statically present is `ocRecentAll`; this is intentional because it is dynamically rendered only when Recentes > 5.

## Remaining acceptance gates
- [ ] Integrate Clean V2 into an isolated app preview/cutover branch without deleting legacy.
- [ ] Syntax/runtime validation.
- [ ] Mobile 390×844 runtime/visual validation.
- [ ] Tablet 768×1024 runtime/visual validation.
- [ ] Desktop 1440×900 runtime/visual validation.
- [ ] Physical Android validation.
- [ ] Final parity audit against the accepted current Chat.
- [ ] Only after all above: 5/5.

Presence in this gate is not itself runtime validation.

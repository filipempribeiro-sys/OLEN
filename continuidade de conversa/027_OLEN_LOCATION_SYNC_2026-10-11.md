# Checkpoint 027 — OLEN: localização e sincronização

Data: 11-10-2026. Estado: implementação entregue; validação física e reativação definitiva do Supabase pendentes. Não considerar concluída a tarefa em produção.

## Implementação e arquitetura

O Chat não recebia o GPS já disponível no Mapa/GO. Foi criada uma ponte de contexto, sem substituir o motor de mapa, cartografia, HUD, routing ou tracking. Web, Android e Worker partilham deviceLocation: coordenadas numéricas válidas, precisão real, timestamp da plataforma, origem, permissão, idade e freshness recalculada. Limiar: 60 segundos; tolerância de relógio futuro: 5 segundos. Não se aceitam coordenadas inferidas de IP, parceiro ou respostas anteriores da IA.

Leituras concorrentes partilham uma operação. O Chat reutiliza o fix existente; se necessário pede uma leitura limitada a 15 segundos. Permissão negada, GPS desligado e ausência de fix produzem uma explicação natural, sem pesquisa ou coordenadas inventadas. Weather contextual usa o fix real; Open-Meteo e reverse geocoding Nominatim são consultados em paralelo. Falha de reverse geocoding não autoriza inventar endereço. Experience Discovery recebe o contexto estruturado completo.

OPEN_MAP_AT_CURRENT_LOCATION centra o mapa existente e usa o marcador existente. A ação externa só é criada perante pedido explícito de Google Maps; Web apresenta link, Android usa deep-link de mapas com fallback HTTPS. Não se inicia ou termina uma atividade por esta ponte.

## Sincronização Android

Foram corrigidos concorrência, revisões, reconciliação e lifecycle: single-flight por owner/record, revisão atualizada após sucesso, fetch/reconcile uma vez após 40001, uma única nova tentativa de conflito, backoff limitado apenas para falhas transitórias, cancelamento na mudança de conta e circuit breaker perante permissão negada. Há máximo de quatro tentativas combinadas; um segundo conflito aborta e aplica cooldown de 60 segundos. Conflitos incompatíveis preservam ambas as versões e exigem revisão; não há last-write-wins silencioso. Foreground e refresh não instalam listeners adicionais. Logs não incluem tokens ou payload pessoal.

A auditoria confirmou chamadas PostgREST à RPC em conflito; não permite identificar a versão instalada que originou a tempestade. O SDK instalado supabase-js 2.117.2 não repete POST automaticamente: o código de retry permite apenas GET/HEAD/OPTIONS. A causa da reincidência em produção não deve ser atribuída sem prova ao SDK atual ou à APK nova, que não foi instalada.

## Ficheiros principais

Web: js/olen-device-location.js, js/olen-location-bridge.js, js/olen-cloudflare-chat.js, js/olen-map-routing.js e inclusão/cache de scripts em index.html. A alteração ao router protegido é uma ponte mínima de sete linhas; olen-go-runtime.js não foi alterado.

Worker: cloudflare/device-location.cjs, cloudflare/location.cjs, cloudflare/patch-location.mjs, cloudflare/chat-stream.cjs, cloudflare/conversation.cjs e integração de build. Entrypoint cloudflare/worker.mjs; configuração Wrangler do Worker olen-alpha-ai. Render/server.js preservado.

Android: src/native/device-location.js e tipos, broker de localização, services.ts, ChatScreen, MapScreen e Root na ponte de contexto/ação; src/sync-engine.js e tipos, src/sync.ts, lifecycle Auth; CarDeviceLocation.kt, ponte GPS em OlenNavigationService e contexto em CarAssistant. Correções mínimas de lint: catches SecurityException, guard API26 áudio e camera feature opcional. Build Gradle usa caminhos curtos no Windows.

SHARED: contrato, intenção de localização, explicações, weather e ações. WEB_ONLY: browser bridge/link. ANDROID_ONLY: permissões, lifecycle, sync e deep-link. BACKEND_ONLY: validação, enriquecimento e política da IA.

## Publicação confirmada

Worker: filipempribeiro-sys/alpha-ai-backend, branch cloudflare-turnstile-olen-chat-20260925, commit ecc0ef95ced6db8a22bc014045ae2facf9066ff2. Versão Cloudflare 44b72b40, 100% do tráfego, confirmada novamente às 14:34 UTC. Endpoint https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev. /api/health 200; /api/chat sem credenciais 401 OLEN_TEST_AUTH_REQUIRED, sem enfraquecer autenticação. Modelo configurado: gpt-6-luna.

Web: filipempribeiro-sys/OLEN, branch cloudflare-integration-20260925-rollback-safe, commit funcional a5d9e9955b9ebbcb02d357d3c5dafe75b9262f2c. Deployment b98f66df-15e7-4b07-bedd-1fcb15f871f0, confirmado novamente às 14:34 UTC. https://olen-chat-teste.pages.dev/. Este checkpoint é um commit documental posterior; não altera o código funcional referido acima.

## Testes e artefactos

- Worker: 46 testes passaram (028-worker-tests-final.log).
- Sync/mobile: 16 testes passaram, incluindo single-flight, conflito repetido, conta, foreground, auth e GPS (028-sync-tests-final.log).
- Web bridge: quatro testes passaram, incluindo permissão pendente limitada e abertura/centragem no router real sem modificar estado GO.
- TypeScript e sintaxe JavaScript passaram.
- Android: cinco testes unitários; assembleRelease, testReleaseUnitTest e lintRelease concluídos. Lint: zero erros, 35 avisos existentes.
- APK autónoma ARM64: OLEN-0.1.10-location-sync.apk; package com.origemlabs.olen; versionName 0.1.10, versionCode 11; min24/target36; 66.226.116 bytes; SHA256 dd980f0c5352eb8dfc9b4139928b1686850dfc0563489250b982dbd12daae518. Assinatura de testes AndroidDebug, não chave de publicação de loja.
- Código nativo arquivado: OLEN-0.1.10-source.zip, 249 ficheiros, SHA256 fe3e68f5ed240b07780702ef4346b3993a040db11a13be8e80c4a144374cb24a; sem .env, keystores ou node_modules.
- 96 assets originais Maneuvers byte-idênticos; cartografia preservada. Não equivale a teste físico completo de navegação.

Web real: Bom dia respondeu em 00:00. Localização exata, nosso mapa/go e tempo aqui sem fix produziram explicação correta em cerca de 14 segundos cada, sem inventar local ou abrir um ponto fictício. Prova: OLEN-027-web-location.png. Weather e reverse geocoding reais passaram com coordenadas públicas de Porto usadas como fixture, não GPS do utilizador (028-location-live-verification.json).

## Supabase: reativação falhou a validação prolongada

Projeto exclusivo OLEN wlehkzvhdgnbslhgpnxj. Função public.save_user_record e RLS mantêm controlo otimista e ownership; não foi aplicado UPSERT cego nem retirada a exceção 40001.

| Janela UTC | RPC authenticated | Rollbacks acumulados | Evidência |
|---|---|---:|---|
| 08:41–09:21 | bloqueada | 53.740.986, estáveis | Sem nova subida durante ~40 min |
| 09:23:19 | reativada após build/testes | 53.740.986 | GRANT controlado |
| 09:23:44–09:25:36 | ativa | 53.740.987, estáveis | Um ROLLBACK explícito do teste |
| 10:17 | ativa | — | 6.001 erros 40001/minuto |
| 10:18:50 | novamente bloqueada | — | REVOKE externo observado nos logs |
| 14:26:25 | bloqueada | 53.888.417 | +147.430 desde a leitura anterior |
| 14:33:34 | bloqueada | 53.888.418 | +1 da consulta de auditoria a cron.job inexistente |

Teste controlado foi uma sessão SQL authenticated com JWT sub interno, criação 0→1, update 1→2, conflito intencional, fetch/reconcile e tentativa 2→3; transação integralmente revertida. Não foi teste HTTP feito pela APK.

Reincidência: 11.606 conflitos entre 10:16:46 e 10:18:51, com PostgREST 14.18/authenticator e consulta pgrst à função, numa sessão DB. O REVOKE às 10:18 foi efetuado por outro interveniente durante a interrupção; não o atribuir a este agente. Logs HTTP disponíveis nessa janela continham apenas uma amostra /auth/v1/user 200, insuficiente para identificar APK, user-agent ou cliente responsável. Não usar amostragem HTTP para inferir ausência de chamadas RPC.

Depois do bloqueio, janela 14:26–14:32: zero mensagens Synchronization conflict e zero permission denied; os contadores cumulativos antigos não desaparecem. Auth health respondeu 200. Não está demonstrada estabilidade com a RPC ativa: NÃO reativar novamente antes de identificar/parar o cliente antigo e validar a APK corrigida em sessão real.

## Limitações e próximos passos obrigatórios

ADB não apresentou dispositivos ligados. A APK foi compilada e verificada, mas não instalada nem executada por este agente. Faltam teste físico de GPS/movimento, ação positiva Mapa/GO e Google Maps em dispositivo, Android Auto em hardware e uma sessão HTTP real da APK contra Supabase. A verificação automática Cloudflare limita testes autenticados de investigação no browser; não foi contornada.

Não há prova de regressão visual nas áreas protegidas por alteração desta tarefa, mas os checks de código/assets/unitários não certificam todos os fluxos físicos Home/Agenda/Perfil/routing/tracking/GO/STOP/HUD/Auto. PartnerContext e QR/Lens foram preservados, não substituídos por análise genérica; catálogo privado de parceiros ainda não disponibilizado pelo cliente.

Próximo passo: instalar 0.1.10, identificar e interromper o cliente que continua a enviar revisões antigas, validar uma única sessão da APK; só então efetuar novo GRANT acompanhado de taxas recentes RPC/40001/42501/5xx/rollbacks. Se houver reincidência, revogar imediatamente e parar testes em produção. A tarefa mantém-se incompleta até esta validação real.

# OLEN — experiências locais, paridade e Android Auto

## Implementação e publicação verificadas

- Backend ativo: `https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev`.
- Repositório: `filipempribeiro-sys/alpha-ai-backend`; branch `cloudflare-turnstile-olen-chat-20260925`.
- Commit funcional final: `c1661f8e4991d126fb47c7e5b5468139c97b7b8f`; Worker `ac341790-6fce-4797-b874-db323083ab15`, build `3c105ae2-2330-4725-ab7d-ee1fccbc81d9`, Ready, 100% no painel Cloudflare.
- Wrangler preservado, entrypoint `cloudflare/worker.mjs`, servidor gerado pela cadeia de patches Cloudflare. `server.js` original/Render não foi alterado.
- `/api/health`: ok/ready, platform cloudflare-workers, experienceModel 1.0. `/api/chat` verificado pela Web com pesquisa e respostas reais.
- Web: `filipempribeiro-sys/OLEN`, branch `cloudflare-integration-20260925-rollback-safe`, commit `45ceab387bce96a7f491e3f3a81551610eea372d`.
- Pages em produção: `98cbc1d6-6529-464f-afd5-4ece479c4842`, `https://olen-chat-teste.pages.dev/`.
- Código Android real: `C:/Users/andre/Documents/Codex/2026-09-30/co/olen-mobile`. Este diretório não tem repositório Git; não atribuir uma branch/commit remoto inexistente à APK.

## Classificação das alterações

- SHARED: contrato Experience, normalizador JavaScript idêntico em Web/APK, apresentação de recomendação principal/alternativas e detalhes, manutenção de contexto recente, encaminhamento para mapa existente.
- BACKEND_ONLY: pesquisa Web automática, seleção de candidatos de famílias distintas, evidência de campos operacionais, valores desconhecidos nulos, parceiro não autenticado não recebe estatuto oficial, preferência atual sobre rejeição antiga. Resultado consumido por ambas as plataformas.
- ANDROID_ONLY: interfaces Car App Library para pesquisa, navegação e assistente; ditado/TTS nativos; sessão do telefone em memória; limpeza de contexto e respostas na mudança de conta; GPS recente mesmo sem navegação iniciada; timeout de localização/ditado. A Web partilha o serviço e os resultados, sem uma interface Android Auto.
- WEB_ONLY: diálogo HTML para detalhes, necessário pela plataforma; equivalente funcional ao Sheet nativo. Sem reformulação da Home, Mapa/GO ou navegação global.

## Verificações

- 26 testes backend passaram, incluindo autenticação nativa, Turnstile Web, saudações, contexto, pesquisa, orçamento de execução, chamadas de tools fechadas, preços desconhecidos e mudança de preferência.
- 3 testes de paridade Web/APK passaram: normalizador byte a byte (também confirmado contra o ficheiro publicado no GitHub), campos/URLs ausentes, persistência e transmissão de experiências recentes. TypeScript passou sem erros.
- Testes reais na Web, numa conversa de Praia Grande/Sintra: descoberta (52 s), atividade mais ativa/sem água/duas horas (48 s), crianças/orçamento 25 EUR (22 s), surpresa com restrições (24 s), mudança para surf (131 s), vento/alternativa em terra (31 s). Alguns critérios foram combinados no mesmo pedido; não são dez pedidos independentes.
- A primeira descoberta mostrou surf, passeio e gastronomia. Restrições fortes podem reduzir a lista; quando faltam factos, a OLEN explica a limitação. Não garantir vagas, estado do mar ou custo/duração não publicados.
- Um cartão chamou uma atividade sem preço confirmado de gratuita: corrigido e coberto por teste. Dados já guardados numa conversa anterior à correção não são reescritos retroativamente.
- Detalhes e ligação à fonte oficial verificados na interface Web. Provas locais: `024-olen-web-deployment.jpg`, `024-olen-worker-deployment.jpg`, `024-olen-experience-details.jpg`, `024-olen-experience-web.jpg`.

## Limites e continuidade

- PartnerContext é contexto, não integração autenticada com stock/reservas. QR/Lens podem fornecer contexto quando existente; esta alteração não cria novos scanners nem acordos comerciais.
- Sem dispositivo Android ligado (`adb devices` vazio). Android Auto em carro real/DHU não foi validado.
- Aplicações Car App Library exigem distribuição de confiança para teste real; instalar a APK manualmente não garante que apareça no launcher Android Auto. Referência: https://developer.android.com/training/cars/testing.
- A assinatura de testes existente foi preservada. Publicação Google Play e assinatura de produção são etapas distintas.
- Regra permanente: alterações funcionais futuras têm de alcançar APK e Web Cloudflare; documentar diferenças próprias da plataforma. Não introduzir workflows automáticos de GitHub Actions. Pesquisa/decisão pertencem ao Worker.
- Release Android: BUILD SUCCESSFUL, lint vital e testReleaseUnitTest passaram. Debug: BUILD SUCCESSFUL em 10m40s; APK de desenvolvimento gerada. Esta variante depende do Metro; entregar ao utilizador a APK release autónoma.

## Artefacto Android verificado

- APK: `outputs/OLEN-0.1.5-android-auto-experiences.apk`, versão 0.1.5/code 6, package com.origemlabs.olen, arm64-v8a, min SDK 24, target SDK 36.
- SHA-256: `ab64b18cf5cbf3bbd9b2a20da6fec7296d81b491be72c1b7f94481e98c1efa0c`; 57.956.338 bytes.
- JavaScript incorporado, assistente/GPS/bridge nativos presentes no DEX; 96 ícones e cartografia iguais aos originais.
- Assinatura verificada, certificado de testes preservado: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Não é assinatura de produção Google Play.
- Código nativo arquivado em `outputs/OLEN-0.1.5-native-source.zip`, sem ficheiros .env, keystores, node_modules ou caches.
- Resultados dos testes Android: [{"name": "com.origemlabs.olen.car.CarAssistantPolicyTest", "tests": "2", "failures": "0", "errors": "0", "timestamp": "2026-10-10T13:46:37.447Z"}, {"name": "com.origemlabs.olen.car.CarRouteTest", "tests": "3", "failures": "0", "errors": "0", "timestamp": "2026-10-10T13:46:37.472Z"}]


## Comparação com Media Hub

- Confirmado no código local: MediaHubAutoMediaLibraryService usa Media3 MediaLibraryService/MediaBrowserService. A OLEN usa CarAppService, categoria navigation, mapa e templates nativos; não deve ser registada como media para obter uma exceção de instalação.
- Health do Worker novamente verificado nesta entrega: ok=true, ready=true, versão 4.3.16, experienceModel=1.0.

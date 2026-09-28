# OLEN Maneuvers — integração Mapa/GO · 28/09/2026

## Origem e proteção
- Origem factual: `OLEN Maneuvers.txt` na Biblioteca `/OLEN/continuidade de conversa/`, com a cronologia da biblioteca original.
- Ramo isolado `olen-maneuvers-safe-integration-20260928` criado sobre `4db8850125b228dd28fef7007283da93bbb26e8a`.
- Rollback bloqueado pré-maneuvers `rollback-olen-pre-maneuver-library-2026-09-21` em `560be470d154e18e47203c75466dc902f2d8809e`; não modificar.
- `main`, Chat, Home, Agenda, Perfil, layout e CSS do HUD preservados. Sem Actions ou Render.

## Integração atual
1. `js/olen-maneuvers.js`: registry dos 96 IDs existentes, incluindo 74 autocaravana, 92–96 transportes. Fallback de manobra não reconhecida é neutro (sem PNG), preserva texto da rota e não inventa seta em frente. `set(data)` recebe o objeto completo, mantendo provider e número da saída. A ausência de asset esconde o ícone, sem substituir por manobra incorreta.
2. `js/olen-go-runtime.js`: removida indicação de rua e seta demonstrativas em `beginSession`. O GO aguarda a indicação real do router.
3. `js/olen-map-routing.js`: cada passagem de etapa real envia ao HUD o objeto completo de manobra, distância corrente, rua e instrução. Valhalla numérico traduz-se para tipo canónico; desconhecidos permanecem neutros.
4. `js/olen-osrm-adapter.js`: conserva `exitNumber` até 12 e `drivingSide` e metadados `lanes` de uma única interseção quando presentes no payload real. Para saídas 7–12 usa ícone genérico de rotunda com a saída numerada em texto, sem fingir existir PNG específico.
5. `index.html`: apenas versões de cache atualizadas para os quatro scripts. Dependências mantidas na ordem adaptador OSRM → router → biblioteca → GO. Não foi refeito o HTML da aplicação.

## Evidências automatizadas
- `tests/olen-maneuvers.test.cjs`: 13 casos de registry, neutralidade, render, quatro providers, camelCase, saídas, rampas não verificadas e erro de imagem.
- `tests/olen-osrm-adapter.test.cjs`: 9 casos, incluindo saídas 1–12 e metadados de faixas.
- `tests/olen-map-maneuver-unknown.test.cjs`: 2 casos.
- `tests/olen-go-maneuver-integration.test.cjs`: 6 casos da etapa de rota real ao HUD e ausência de demonstração.
- `tests/olen-map-routing-regression.test.cjs`: 3 casos do fallback de geocodificação e rotas alternativas.
- Total **33 casos** aprovados com execução JavaScript isolada de fontes lidas do GitHub. Sintaxe dos quatro módulos verificada; dependências e hashes verificados. Estes resultados NÃO equivalem a execução Node nativa, browser visual, GPS físico, CORS real ou navegação na estrada.

## Ainda não certificado
- A identidade visual dos 96 PNGs não foi auditada imagem a imagem nesta execução. O utilizador já tinha aprovado a biblioteca; não trocar IDs sem inspeção.
- Mapeamento Google/Mapbox/HERE/TomTom inclui aliases e exemplos determinísticos; sem payloads live de cada provider e respetiva licença, não afirmar cobertura universal nem certificação desses serviços. A rota efetivamente integrada no GO é a do Worker/Valhalla ou OSRM.
- `lanes` são preservadas e as faixas válidas/ativas aparecem no pequeno texto existente sob a distância até à próxima manobra, apenas quando a rota fornece esses dados. Sem dados de faixas, o texto habitual do HUD permanece. A apresentação visual definitiva com setas por faixa ainda depende de auditoria dos PNGs e teste mobile.
- Sem inspeção/validação da publicação Cloudflare nem teste browser/dispositivo nesta fase; confirmar deployment após o ramo de testes ser atualizado.

## Aceitação manual OLEN
No URL habitual `https://olen-chat-teste.pages.dev/`, após deployment do commit, preparar rota real com manobras diferentes (direita, esquerda, rotunda), iniciar GO em local seguro, observar mudança da imagem e do texto à medida que o GPS avança, confirmar o número da saída quando presente e fazer STOP. Verificar que o HUD desaparece, GO/Reportar voltam a ficar visíveis, e que o restante Mapa/GO e outras abas não regrediram. Não testar manobras ou ecrã durante a condução.

## Verificação documental dos providers
- Google Routes enum de manobras: https://developers.google.com/maps/documentation/routes/reference/rpc/google.maps.routing.v2
- Mapbox Directions v5: tipos/modificadores, `exit` nas rotundas e faixas: https://docs.mapbox.com/api/navigation/directions/
- HERE Routing v8: `turnByTurnActions` tem `action` e `direction`; o conjunto de ações é extensível: https://docs.here.com/routing/docs/routing-v8-action
- TomTom Android Navigation SDK: instrução `ExitRoundaboutGuidanceInstruction` fornece `exitNumber` e `drivingSide`: https://developer.tomtom.com/assets/downloads/tomtom-sdks/android/api-reference/1.25.6/navigation/navigation/com.tomtom.sdk.navigation.guidance.instruction/index.html
- Não são pedidos de navegação efetuados a estes quatro serviços: são mapeamentos determinísticos de dados de origem externa. Rampas/saídas sem semântica direcional comprovada usam ícone neutro, não uma seta de viragem.

## Pós-primeira publicação — lane guidance
A versão inicial publicada foi `9dd0955023987bb7d378d07b0fa5311ec65f99f5`. Seguiram-se commits isolados para assegurar que metadados `lanes` de interseções diferentes não são fundidos e que a faixa ativa/validada aparece na linha de indicação do HUD. Este documento continua a exigir validação de Cloudflare/telemóvel antes da aceitação final.


## Fecho técnico adicional — preparação para validação do utilizador
O ramo inicial de trabalho e o ramo que alimenta o Cloudflare estavam ambos em `74653c7b100b7ac2922b0d6842f3073e9108920b` ao início desta continuação. Foi criado ramo isolado `olen-maneuvers-field-safety-20260928` a partir desse commit. Não foram alterados o rollback bloqueado, `main`, o design/CSS, Chat, Agenda, Home ou Perfil.

- Saída do percurso confirmado: ao ultrapassar 130 m do traçado, o router deixa de manter no HUD a última seta de viragem; emite estado neutro `unknown`, instrução explícita de confirmar a posição, distância `—` e limpa as indicações de faixa. Repetidos fixes fora da rota não reescrevem o HUD. Ao regressar ao traçado, a manobra real e a informação de faixa são recuperadas.
- Mudança de GO rodoviário para Trail GO: a indicação visual da estrada anterior é anulada antes da primeira localização GPS do trilho; o texto passa a indicar o trilho GPX e que a homologação está por verificar.
- Falha de imagem PNG: um asset que deu erro mantém-se escondido nas atualizações seguintes da mesma manobra. Um novo asset válido pode carregar, sem reutilizar uma seta falhada.
- Inventário de assets: a árvore GitHub do commit de base não estava truncada e continha os 96 caminhos `assets/maneuvers/olen-maneuver-01.png` a `olen-maneuver-96.png`, sem números em falta. Isto verifica existência no Git, não identidade visual nem capacidade de o browser carregar todos os PNG.
- Testes: 38/38 casos distribuídos por 6 suites executados com as fontes atuais recuperadas pelo conector GitHub, num ambiente JavaScript isolado com APIs Node simuladas. Sintaxe dos quatro módulos verificada. A execução Node nativa no repositório não foi possível neste ambiente porque a resolução DNS de `github.com` falhou. Não chamar a estes testes «testes GPS real», «browser visual» ou «homologação».
- Critérios de validação no URL habitual: deployment Cloudflare do commit efetivamente publicado, troca sucessiva direita/esquerda/rotunda com saída numerada, ausência de seta fictícia quando não há dados, modo Trail GO sem seta rodoviária herdada, saída da rota com indicação neutra e recuperação depois do regresso, STOP limpa o HUD, GO/Reportar visíveis fora do GO. Os testes de terreno são do utilizador em contexto seguro e nunca manipulando o ecrã durante a condução.

O objetivo desta publicação é **pronto para validação manual**, não certificação de navegação em produção ou Android Auto.


## Fecho final da integração Maneuvers — 28/09/2026

Esta secção substitui os totais de testes e limitações dos checkpoints anteriores quando houver divergência.

### Compatibilidade real do motor ativo
- O retorno do Worker/Valhalla é normalizado antes de entrar no GO: `begin_shape_index`/`beginShapeIndex` → `pointIndex`; `street_names`/`begin_street_names` → `road`; `roundabout_exit_count` e variantes → `exitNumber` (1–12). O objeto original é preservado.
- Os tipos Valhalla documentados usados pela navegação foram revistos: continue/becomes/stay-straight, viragens, U-turn esquerda/direita, stay-right/stay-left, merge, rotunda, ferry e saída direita/esquerda. Rampas sem identidade visual auditada permanecem neutras em vez de fingirem uma viragem.
- O fallback OSRM conserva `provider:'osrm'`, saídas de rotunda, `driving_side` e lanes da mesma interseção. Forks esquerda/direita são reconhecidos; on/off-ramp sem visual certificado ficam neutros.
- O renderer aceita diretamente formas provider-native relevantes: Google `navigationInstruction`, Mapbox `maneuver` aninhado, HERE `action/direction` e TomTom `instructionType`, além do modelo canónico OLEN.
- Texto, rua e distância deixam de herdar valores da manobra anterior: valores provider-native atualizam o HUD e um estado desconhecido limpa rua/distância antigas.
- Rotundas 1–6 continuam com PNGs dedicados; 7–12 usam rotunda genérica com número real no texto. Quando `drivingSide=left`, o visual da rotunda é espelhado sem criar novos assets.
- `keep-left` e `exit-left` usam versões espelhadas, em runtime, dos assets aprovados de direita. Nenhum PNG 97+ foi inventado e o ID 74 permanece reservado à AUTOCARAVANA.
- Lane guidance mantém índice esquerda→direita e, quando a lane selecionada fornece `validIndication`/indicação inequívoca, acrescenta a direção ao texto (ex.: `Faixa 2/3 · direita`). Sem metadata verificável, mostra apenas o índice ou o texto padrão.

### Auditoria visual dos assets utilizados pela navegação
Foram inspecionados diretamente a partir dos blobs GitHub os principais grupos de manobra 01–60 e o lane-guidance 91, além dos extras 92–96. Os grupos confirmam a identidade dos recursos usados para straight, viragens, forks, merge/keep, motorway/exit, rotundas, start/finish e lane guidance. O asset 74 é protegido pelo requisito histórico AUTOCARAVANA e não foi substituído nem reinterpretado.

### Evidência de testes final
Foram executados **63/63 casos** de lógica/integração com as fontes atuais do ramo:
- `tests/olen-maneuvers.test.cjs`: 26/26
- `tests/olen-osrm-adapter.test.cjs`: 11/11
- `tests/olen-map-maneuver-unknown.test.cjs`: 4/4
- `tests/olen-go-maneuver-integration.test.cjs`: 8/8
- `tests/olen-go-off-route-maneuver.test.cjs`: 3/3
- `tests/olen-map-routing-regression.test.cjs`: 3/3
- `tests/olen-valhalla-maneuver-normalization.test.cjs`: 4/4
- `tests/olen-valhalla-to-hud-integration.test.cjs`: 2/2
- `tests/olen-osrm-to-hud-integration.test.cjs`: 2/2

Os dois testes de ponta a ponta isolados provam o encadeamento de **payload raw Valhalla/OSRM → normalização/adaptador → OLENNavigationGuide → PNG/texto real do HUD**. A sintaxe dos quatro módulos principais foi novamente validada.

### Limites de aceitação
Estes testes não são GPS físico, navegador real, Android Auto ou percurso rodoviário. Google/HERE/TomTom continuam a ser compatibilidade de input, não providers live ligados nesta instalação. A aceitação final desta frente é, portanto, o teste do utilizador no URL habitual da OLEN após o deployment Cloudflare do commit publicado.

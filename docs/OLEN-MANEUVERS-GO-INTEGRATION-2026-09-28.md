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

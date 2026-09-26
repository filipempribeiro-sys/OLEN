# OLEN — Mapa/GO · matriz de execução e evidência
Data: 2026-09-26. Esta matriz distingue código, testes isolados e validação real. NÃO equivale a aprovação para produção.

## Referências e proteção
- Base e rollback: `rollback-before-map-go-p0-20260926` em `bbc58774a88012231836fc043c03978a522e52bb`.
- Ramo anterior preservado: `olen-map-go-p0-tracking-20260926`, HEAD inicial desta integração `deed62f4e473a6bc5b545f5801071042c6fdf341`.
- Ramo atual: `olen-map-go-p0-p4-integration-20260926`.
- Nenhum merge para `main` ou publicação em produção.
- A ALPHA de referência é `filipempribeiro-sys/outdoor-alpha-1@7149498d`. O MapLibre original era 5.6.1/OpenFreeMap Liberty; a descoberta de trilhos utilizava relações OSM/Overpass. OSM não é prova de homologação.

### Estados
- 🟢 implementação + teste aplicável executado e aprovado;
- 🟡 existe trabalho, mas falta integração, teste de navegador, validação visual, terreno, fonte ou contrato;
- 🔴 ausência ou falha confirmada. Não transformar teste de sintaxe em prova funcional.

## P0 — Fundação e GPS
| Requisito | Estado | Implementação/evidência | Falta para fechar |
|---|---|---|---|
| Rollback/ramo isolado | 🟢 | GitHub rollback e branch de integração separados; compare sem alterações à base | manter durante merge futuro |
| Fonte única de GO | 🟡 | `js/olen-go-runtime.js` extraído do HTML, sessões GO partilhadas para rota e Trail GO; `js/olen-map-routing.js` mantém geometria/provedor | retirar ownership legado e ativar apenas um controlador após regressões |
| Filtro GPS e distância | 🟡 | `js/olen-gps-track.js`; 10 testes de simulação aprovados | GPS físico/precisão em campo |
| Tracking desenhado | 🟡 | `js/olen-map-routing.js` usa pontos aceites e camada incremental | teste visual real e deslocação |
| Persistência e histórico | 🟡 | `js/olen-go-history.js` e STOP; 6 testes aprovados | UI de recuperação e perdas de energia/reload |
| GO → STOP → Experience | 🟡 | `js/olen-go-experience-bridge.js`; 5 testes isolados aprovados | regressão real entre Home/Chat/GO/Perfil |
| Cinco controlos | 🟡 | ações Leaflet ligadas: camadas, seguir GPS, recentrar, pesquisar, vista geral | clique e visual nos três dispositivos |
| Falha/recusa GPS | 🟡 | STOP em recusa; aviso em perda de sinal; não adiciona fixes rejeitados | simulações browser e testes físicos |
| Serviço de rotas | 🟡 | mantém Worker/Valhalla legado e valida geometria | chamada end-to-end, trânsito/mode e falhas reais |

## P1 — Núcleo outdoor
| Requisito | Estado | Implementação/evidência | Falta para fechar |
|---|---|---|---|
| Descoberta de trilhos OSM | 🟡 | `js/olen-trails-catalog.js`, cache 6h, consultas limitadas, provenance; 5 testes | resposta Overpass live, limites e CORS em produção |
| Seleção/desenho de trilhos | 🟡 | UI `js/olen-trail-discovery-ui.js`, preview interno Leaflet | teste visual e trilhos OSM reais |
| Importar/exportar GPX | 🟡 | `js/olen-trails-gpx.js`, import picker, export programático; 5 testes | parser em navegador real, botão export e vários GPX reais |
| Trail GO/progresso/desvio | 🟡 | `js/olen-trail-guide.js`, session GO sem manobras fictícias; 4 testes | percurso físico, GPS fora de trilho e recuperação |
| Ficha outdoor/guardados | 🔴 | não existe UI completa no ramo ativo | ficha, biblioteca e storage de trilhos |
| Reports georreferenciados | 🟡 | `js/olen-go-reports.js` + UI, guarda local com GPS válido; 4 testes | fotografias e circuito comunitário com moderação |
| STOP/avaliação/histórico | 🟡 | grava histórico local, Experience rating e resumo | UI de histórico e comentários persistidos na app |
| Fotografias/meteorologia | 🔴 | sem integração com ficha de trilho | dados e UI apropriados |
| Altimetria GPX | 🟡 | `js/olen-trail-metrics.js` calcula subida/descida quando há elevação; 4 testes | DEM oficial/licenciado, UI de perfil e verificação em trilhos reais |

## P2 — Mapa, motor e dados oficiais
| Requisito | Estado | Implementação/evidência | Falta para fechar |
|---|---|---|---|
| MapLibre Aurora | 🟡 | protótipo isolado `experiments/olen-maplibre-aurora.html`; base ALPHA MapLibre 5.6.1 | prova visual/device, custos, fonte estável, paridade Leaflet |
| GO em perspetiva inclinada | 🟡 | protótipo alterna pitch; não usa motor GO ativo | navegação real/validação 3D em dispositivo |
| Relevo DEM | 🔴 | não integrado | dados raster-dem licenciados e performance |
| Voz e perfis por transporte | 🔴 | GO atual mantém manobras visuais; voz não instalada | TTS, testes de cada modo e background |
| Tablet/desktop | 🟡 | mantém stylesheet responsive anterior | screenshots e regressões a vários tamanhos |
| Dificuldade/elevação/météo | 🟡 | métricas GPX locais quando existem; dificuldade permanece desconhecida | método fundamentado, meteorologia real e ficha completa |
| ICNF/FCMP/regionais | 🔴 | nenhuma ligação oficial live | licença, metadados, WFS/WMS e procedimento institucional |
| Homologação/acesso | 🟡 | UI OSM/GPX nunca atribui selo oficial e distingue homologação não verificada | integração comprovada de fontes oficiais e estados por segmento |

## P3 — Comunidade/offline
| Requisito | Estado | Implementação/evidência | Falta para fechar |
|---|---|---|---|
| Rascunhos/edição/moderação/publicação | 🔴 | reports locais não são publicação | API autenticada, moderação, auditoria e consentimento |
| Homologação externa | 🔴 | sem protocolo de entidade | confirmação FCMP/entidades e documentos verificáveis |
| LIVE tracking com consentimento | 🔴 | nenhum envio online novo neste ramo | privacidade, sessão, revogação, backend e testes |
| Trilhos offline | 🟡 | GPX/histórico guardados localmente | UI e recuperação de sessão |
| Mapas offline | 🔴 | não há tiles offline autorizados | licença, alojamento, quota e modo offline real |

## P4 — CLEAN e aceite
| Requisito | Estado | Implementação/evidência | Falta para fechar |
|---|---|---|---|
| Extrair runtime monolítico | 🟢 | GO movido para `js/olen-go-runtime.js`, sintaxe verificada, sem inline duplicado | manter ordem de scripts |
| Eliminar legado/runtimes concorrentes | 🟡 | extração inicial; `OLEN5.mapGo` permanece dormente; route engine separado | migração final depois de equivalência comprovada |
| Regressões browser/mobile/tablet/desktop | 🔴 | sem evidência nesta execução | teste real em navegadores e dispositivos |
| Teste de GPS real/rotas reais | 🔴 | sem deslocação executada | percurso físico controlado |
| Produção/merge/checkpoint final | 🔴 | não realizado intencionalmente | validação e autorização de publicação |

## Testes executados
- 44/44 casos de lógica aprovados em ambiente JavaScript isolado: GPS 10, Experience 6, histórico 6, GPX 5, Trail Guide 4, catálogo 5, reports 4, altimetria 4.
- Sintaxe dos módulos e runtime verificada; presença de scripts e IDs verificada no HTML.
- Sem teste de DOMParser real em browser, consulta Overpass live, GPS físico, visual mobile/tablet/desktop, Worker de rotas live ou homologação oficial.
- Risco conhecido: dependência dos serviços externos OSM/Overpass e do Worker; não declarar gratuitidade irrestrita de infraestrutura.

## Próximo critério de liberação
Executar smoke browser em páginas reais, verificar GPX de várias origens, recusa/reentrada GPS, rota rodoviária e Trail GO em terreno, export/recuperação de sessão, UI responsive e regressões de Chat/Agenda/Home/Perfil. Só depois considerar merge.
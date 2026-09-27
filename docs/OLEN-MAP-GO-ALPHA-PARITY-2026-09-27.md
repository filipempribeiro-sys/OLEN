# OLEN Mapa/GO — checkpoint de paridade ALPHA (27/09/2026)

**Estado: migração parcial em validação. Não é entrega 5/5.** Este checkpoint sucede à matriz P0–P4 de 26/09 e às regressões observadas pelo utilizador nas capturas ALPHA/OLEN.

## Proteção e destino
- Fonte ALPHA: `filipempribeiro-sys/outdoor-alpha-1` (ler código real, não converter imagem em prova de funcionalidade).
- Ramo de execução: `olen-map-go-alpha-parity-20260927`, criado sobre `0aae4718e02eac406f5d17e055ae3a210fea2241`.
- Rollback intocado: `rollback-before-map-go-p0-20260926` → `bbc58774a88012231836fc043c03978a522e52bb`.
- O frontend OLEN aprovado (Home, Chat, Agenda, Perfil e footer) não foi refeito. A exploração outdoor foi colocada num modal compacto do Mapa/GO, sem regressar à página vertical extensa da ALPHA.
- Os scripts antigos da ALPHA não foram adicionados ao runtime OLEN; foram recuperadas funcionalidades concretas usando o gravador e o mapa atuais.

## Matriz de paridade — a implementação não substitui a prova em dispositivo
| Área | ALPHA usada como referência | OLEN neste ramo | Estado / prova pendente |
|---|---|---|---|
| Entrada outdoor | Trilhos, caminhos, rotas, guardados e navegação | Acesso compacto `Explorar` no mapa → Trilhos/Rotas/GPS/Guardados | 🟡 testar visual/teclado/mobile |
| GPS e registo livre | Obter fix, precisão, velocidade e tracking sem destino | Painel GPS, início/STOP de tracking livre e histórico local | 🟡 testes físicos/permissões |
| Interrupção e recuperação | Registo persistente | Retoma explícita sem reset; sessão GPS retomada inicia um novo segmento; gaps acima de 45s não somam distância | 🟡 validar perda real/reload |
| Tracking visual | Traçado realizado | Leaflet multi-segmento sem linha fictícia nas perdas de sinal; GPX exporta os segmentos separados | 🟡 validar mapa/GPX importado num navegador |
| Destinos | Pesquisa da ALPHA, cache | Worker primeiro, Nominatim como alternativa, escolha explícita se houver várias localidades | 🟡 verificar respostas e CORS no domínio publicado |
| Rotas/GO | Serviços reais pedonais e rodoviários da ALPHA | Fallback OSRM pedonal/carro com geometria e manobras reais no guia OLEN | 🟡 verificar rede, GPS e condução; outros modos dependem do motor OLEN |
| Trilhos OSM | Pesquisa Overpass perto do destino | Destino primeiro, GPS opcional, cache e última geometria guardada; ficha OSM de origem/dados disponíveis | 🟡 verificar pesquisa live e CORS, licença/limites |
| GPX | Exploração/seguimento de rota | Importação + seleção no mapa, ficha e Trail GO a pé; exportação de atividade no histórico | 🟡 GPX reais, navegador e terreno |
| Camadas | Trilhos/rota/tracking/reports | Alternância independente via controlo Camadas, incluindo reports locais no Leaflet | 🟡 teste visual e regressão de visibilidade |
| Reports | Report local georreferenciado | Registo local com GPS válido e marcador cartográfico, nunca alegado como publicação | 🟡 teste de report real, fotos/moderação ainda pendentes |
| MapLibre Aurora/3D | Motor MapLibre original da ALPHA | Protótipo isolado preservado; Leaflet continua a servir o mapa atual | 🔴 migração de motor ainda não validada |
| Comunidade, homologação, LIVE e mapas offline | Requisitos posteriores P2/P3 | Sem simulação de homologação ou publicação; não integrados | 🔴 dependem de fonte oficial, backend/consentimento e offline licenciado |
| P4 validação final | Equivalência funcional e visual | Checkpoint de código, sem merge para `main` | 🟡 faltam smoke/browser/mobile/tablet/desktop e percurso de campo |

## Testes executados nesta sessão
- **53/53 casos de lógica** aprovados em ambiente JavaScript isolado: GPS 12, Experience 6, histórico 6, GPX 6, guia Trail 4, catálogo OSM 6, reports 4, elevação 4, adaptador OSRM 5.
- Simulações adicionais com os módulos atuais: explorador OLEN 4/4, runtime de tracking e recuperação 2/2, geocodificação/rotas 3/3, escolha explícita de localidade, descoberta+ficha de trilho sem GPS, controlo das camadas; todos os cenários executados deram o resultado esperado.
- Sintaxe dos módulos alterados e ordem das dependências inspecionadas no `index.html`. Os URLs dos scripts alterados foram versionados para evitar reutilizar JavaScript antigo.
- **Não executado:** testes Node nativos no repositório clonado, browser visual, chamadas CORS live ao Worker/OSRM/Overpass, GPS físico, navegação no terreno e confirmação do build Cloudflare. O ambiente de execução não conseguiu resolver `github.com` para clonar o repositório; os testes foram executados com fontes obtidas pelo conector GitHub.

## Critérios para verde
1. Cloudflare apresentar o novo commit como deployment concluído no endereço habitual `olen-chat-teste.pages.dev`.
2. No smartphone: abrir Mapa/GO, Explorar → Trilhos com destino escrito sem GPS; selecionar/focar trilho, ficha e Trail GO.
3. Preparar rota com localidade ambígua (escolher a correta), obter traçado e manobras reais; iniciar, STOP, report e guardar histórico.
4. GPS real: recusar permissão, perder sinal, voltar, reiniciar navegador, retomar e exportar GPX sem ligar segmentos ou somar deslocações não observadas.
5. Inspeção visual mobile/tablet/desktop + regressão Home/Chat/Agenda/Perfil.
6. MapLibre oficial, homologação, LIVE e offline só passam a verde após a integração e validação independentes.

**Não usar o visto verde do deployment como prova de paridade funcional.**

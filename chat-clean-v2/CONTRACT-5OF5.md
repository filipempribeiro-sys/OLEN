# OLEN Chat Clean V2 — Contrato 5/5

A versão Clean só pode ser classificada como **5/5** quando TODOS os requisitos abaixo estiverem implementados, testados e validados. Um teste passar não substitui paridade funcional.

## Regra de aceitação
- Todos os comportamentos válidos da versão atual e da Clean anterior entram.
- Todos os itens amarelos da matriz são resolvidos.
- Nenhum elemento aprovado da versão atual pode ser simplificado, omitido ou substituído por placeholder.
- Zero V2/V3/V4, zero dupla autoridade do Chat, zero patches corretivos de legado.
- Zero erros de runtime e sintaxe.
- Mobile, Tablet e Desktop validados antes de integração em main.
- A main não é alterada durante a reconstrução.

## Elementos visuais obrigatórios 1:1 com a versão atual
- Nova conversa: SVG de composição atual; nunca um + textual.
- Rail/sidebar: ícone OLEN atual; nunca ☰ como identidade da rail.
- Navegação Início / Mapa / Chat / Agenda / Perfil: SVG reais atuais; nunca ⌂ ◇ □ ▣ ○.
- Wordmark OLEN, pesquisa, estados expandido/recolhido e tooltips preservados.

## Sidebar obrigatória
- Nova conversa; Imagens; Biblioteca; Projetos / Planos; Agendados.
- Afixados (máximo 10).
- Recentes (5 + Ver todas).
- seleção e persistência de conversa; menu ⋮; long-press 500 ms.
- Fixar / Desafixar, Renomear, Eliminar com confirmação.
- pesquisa em título e conteúdo; incluir nomes de anexos na Clean.
- navegação principal completa integrada na rail em Tablet/Desktop.

## Núcleo Chat obrigatório
- mensagens User/OLEN visualmente distintas.
- composer responsivo, Enter, auto-resize; enviar / voz / stop.
- tons Equilibrado / Direto / Explorar persistentes.
- ditado pt-PT.
- anexos múltiplos, remoção antes de envio e metadados para o engine.
- Conversation Engine desacoplado e preparado para API.
- estados generating / stopped / error.
- copiar, 👍, 👎, partilhar, retry e Mais por resposta; feedback persistente.
- avaliação periódica “foi útil?” preservada.
- menu geral: Partilhar conversa / Conversas / Início.
- cartões e respetivas ações preservados e funcionais.

## Responsividade
- Mobile: footer global presente; sidebar overlay.
- Tablet/Desktop: sem footer global no Chat; navegação na rail.
- rail e conteúdo/composer recalculados estruturalmente quando expandida.
- safe areas e landscape tratados na própria arquitetura.

## Gate final
Só aceitar 5/5 se:
1. Matriz funcional = 100% verde.
2. Teste automatizado cobre cada requisito desta matriz e passa 100%.
3. Inspeção visual Mobile/Tablet/Desktop sem regressões.
4. Teste físico Android sem perda de funcionalidades.
5. Comparação final confirma que nenhum feature aprovado da versão atual desapareceu.

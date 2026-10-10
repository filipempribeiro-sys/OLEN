# 025 — OLEN conversa básica imediata — 2026-10-10

## Resultado e limites
Saudações, agradecimentos e perguntas simples de bem-estar reconhecidos respondem localmente antes de qualquer chamada de rede, GPS, health, Turnstile ou sessão. O normalizador e as frases são idênticos em Web, APK e Worker. Não apresentar este caminho como pesquisa nem inventar informações.
Mensagens mistas, anexos, “Continua”, “Não percebi”, pedidos de planos, horários, preços e disponibilidade continuam no backend autenticado. Não prometer que qualquer conversa livre responde instantaneamente; interpretação contextual ainda pode precisar da IA.
Classificação SHARED (helper), WEB_ONLY (ordem dos callbacks e composer), ANDROID_ONLY (nativePost e APK 0.1.6), BACKEND_ONLY (schema e proteção HTTP existentes).

## Publicações confirmadas
- Worker ativo: https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev
- Backend branch cloudflare-turnstile-olen-chat-20260925; commit 448d14d571863c0880aed8b8922ef214a0920557; versão b2ea1899, Ready, 100%, build 82b58603-b647-4cbb-a254-2f56f58a8141.
- Web funcional branch cloudflare-integration-20260925-rollback-safe; commit 5dfda003817c550b21886302563d3e447b864bf5. Primeira publicação cfb1691e9b2ed2c3e9f7283f8b644ccf955f7174; ajuste de microtask evita deixar o composer em “Parar resposta”.
- Render permaneceu intocado. Nenhum workflow automático foi criado.

## Validação
26 testes Worker passaram; 3 testes de transporte real Web/serviço APK passaram, incluindo ausência de fetch e sessão para mensagens locais, preservação de contexto, mensagens mistas e anexos encaminhados ao backend. TypeScript passou.
Web real: “Olá” visível na primeira observação, 396ms após clique (inclui automação/observação), contador 00:00; “Obrigado” também 00:00 e composer pronto.
Health real ok=true/ready=true; POST /api/chat não autenticado mantém 401.
Prova local outputs/025-olen-immediate-chat.png.
Release BUILD SUCCESSFUL em 3m38s; lint vital e assinatura verificada. APK 0.1.6/code7, ARM64, min24/target36.
APK outputs/OLEN-0.1.6-fast-chat.apk, 57.958.382 bytes, SHA256 174879fd9c6ac1d42d46b1538e820afe94cbafefaf626a5f3c434306ce7ee871. Verificados helper/respostas incorporados, Android Auto nativo, 96 ícones e cartografia preservados.
Sem dispositivo ligado; funcionamento físico da APK/car continua sem validação. Android Auto preservado; este caminho local aplica-se ao chat no telefone/Web, o assistente do carro conserva autenticação e chama o Worker.
Fonte nativa local C:/Users/andre/Documents/Codex/2026-09-30/co/olen-mobile. Testes de transporte em work/fast-chat.test.cjs.

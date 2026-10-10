# OLEN — Web and native Android parity

User requirement: every functional change must reach both the Cloudflare Web version and the native Android APK. Classify differences as SHARED, WEB_ONLY, ANDROID_ONLY or BACKEND_ONLY and explain platform-specific behavior. Do not declare completion after changing only one client.

The active backend is https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev, built from filipempribeiro-sys/alpha-ai-backend on cloudflare-turnstile-olen-chat-20260925. Do not modify Render as the primary backend. Preserve tools, research engine, conversationState, partnerContext and placeCards.

The deployed Web branch is cloudflare-integration-20260925-rollback-safe. Read the current deployment and source before editing; do not publish an older HTML checkpoint as the current application. The native Android application is independent React Native/Expo source, without WebView; locate that source and apply equivalent behavior before producing a new APK. See continuidade de conversa for the audited local path and artifacts.

Experience research and ranking belong to the Worker. Web and APK must share the same experience-model.js normalization and result contract. Operational facts need researched sources; unknown price is not free and missing data must not be invented. Client partnerContext does not authenticate commercial integrations.

Android Auto uses native Car App Library interfaces for navigation, search and the assistant. Compilation does not prove real-car operation; record hardware and trusted-installation validation separately.

Run relevant tests, verify the real Cloudflare deployment and inspect the built APK. Create a sequential checkpoint in continuidade de conversa. Do not introduce automatic GitHub Actions workflows; preserve manual workflows and existing authorized Cloudflare deployment behavior.

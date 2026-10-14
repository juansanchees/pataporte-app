# Pataporte — passagem para o Claude Code (13/10/2026)

Leia este arquivo primeiro. Depois leia CLAUDE.md e AGENTS.md na raiz do projeto.

## O que é
App "Pataporte: Saúde e Rotina pet" (com.pataporte.app). É a agenda da vida do pet, com identidade visual de passaporte.
Stack: Expo SDK 57, expo-router, zustand, Firebase (Auth, Firestore, Storage, Functions `aiTask`, Hosting pataporte-app.web.app), RevenueCat (modo simulado, sem chaves) e EAS Build.
Branch `v1.1`. O último commit (c7a91b4) é exatamente o build **8 (1.0.0)** publicado no Google Play.

## Estado no Google Play
- O teste fechado (Alpha) rodou 14 dias com 15 testadores do Testers Community, em todos os países.
- **13/10:** o pedido de acesso à produção foi enviado e está em análise (até 7 dias).
- O teste interno também está com o build 8.
- Conta de desenvolvedor pessoal: Juan Diego Sanches.

## Feedback dos testadores
Nenhum crash nem bug. As duas sugestões foram:
1. **Login com Google não aparece no Android.** Já tinha sido visto no build 4. É a **próxima tarefa**.
2. Falta um tour inicial (opcional).

## Próximas tarefas (prioridade)
1. Descobrir por que o botão "Entrar com Google" não aparece no build Android de produção e corrigir.
   - Ver `src/services/socialAuth.ts` e `src/app/login.tsx`.
   - Ver as variáveis `EXPO_PUBLIC_*` no EAS (env do profile production).
   - SHA-1 da app signing key já adicionado no Firebase: `DE:D6:20:8E:15:A2:67:A9:E3:89:3C:C0:7D:A5:7F:F3:F5:EA:D3:A6`. O upload key `9D:67:90:…` também está lá.
2. Refazer o print 04 da loja, que ainda mostra "V8 ou V10" (o app já usa só V10).
3. Gerar o build 9: `eas build -p android --profile production` (versionCode é remoto e tem autoIncrement). Quando a produção for aprovada, publicar em Produção.
4. Depois: configurar RevenueCat e os produtos nas lojas (`PAID_PLANS` ainda é false); analytics (Meta/Firebase); iOS (Apple Developer, GoogleService-Info.plist, provider Apple). Para empresa, o D-U-N-S da INFODREAMZ pode ser pedido grátis via Apple.

## Regras que o dono pediu
- Respostas curtas e visuais, em PT-BR. O dono tem TDAH.
- Modo orquestrador: planejar, delegar a subagentes com modelo explícito e verificar (tsc, testes, git diff).
- Nunca colar chaves (Gemini/OpenAI) no chat. Usar apenas `firebase functions:secrets:set`.
- Não compartilhar o Web client secret.
- `.env` fica fora do repositório e dos builds.
- Não apagar o billing do Pataporte.
- Não mexer no projeto Play Integrity ligado a "banco-stalkea".
- Android: não pedir `READ_MEDIA_*` / `FOREGROUND_SERVICE*` / `AD_ID`. Estão em `blockedPermissions` no app.json e o seletor de fotos do sistema dispensa essas permissões. Se voltarem, o Play bloqueia a versão.

## O que NÃO é o app da loja
O backup no Google Drive (07/10) tem uma pasta `projeto/`. É um protótipo antigo "Petfy" feito no Codex: demonstração local, sem Firebase. Não usar, e o mesmo vale para o JSON da "Mimi".

## Arquivos que ficaram de fora deste zip (de propósito)
`functions/.env`, `functions/.env.local`, `functions/.secret.local` e `node_modules`. Rode `npm install` na raiz e em `functions/`. Os segredos ficam no Firebase (Secret Manager).

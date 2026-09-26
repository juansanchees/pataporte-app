# Pataporte — como rodar e testar no seu celular

App em **React Native + Expo (SDK 57)**, com **Firebase** (login e banco de dados na nuvem).
Enquanto o Firebase não estiver configurado, o app roda no **modo de teste**: tudo funciona, mas os dados ficam só no celular.

---

## ⚠️ Antes de tudo: tire a pasta do OneDrive

A pasta `PETFY` está dentro do OneDrive. O passo `npm install` cria uma pasta `node_modules` com **dezenas de milhares de arquivos**, e o OneDrive vai tentar sincronizar tudo (fica lento e pode travar).

**Copie** a pasta `pataporte-app` para fora do OneDrive, por exemplo `C:\projetos\pataporte-app`, e trabalhe por lá.

---

## 1. Instalar o que precisa (uma vez só)

1. **Node.js LTS**: baixe em https://nodejs.org e instale (Next, Next, Finish).
2. No celular, instale o app **Expo Go** (Play Store ou App Store).

## 2. Abrir o app

No Windows, abra o **PowerShell** e rode:

```powershell
cd C:\projetos\pataporte-app
npm install
npx expo start
```

Vai aparecer um **QR code** no terminal.

- **Android:** abra o Expo Go e toque em "Scan QR code".
- **iPhone:** aponte a câmera para o QR code.

O celular e o computador precisam estar **na mesma rede Wi-Fi**. Se não conectar, use:

```powershell
npx expo start --tunnel
```

Cada vez que o código muda, o app atualiza sozinho no celular.

## 3. Ligar a IA (Gemini) — foto que monta o pet + Guia de bordo

1. Entre em https://aistudio.google.com/apikey com sua conta Google.
2. Clique em **Create API key** (Criar chave de API) e copie a chave (começa com `AIza...`).
3. Nesta pasta, crie um arquivo chamado **`.env`** (se ainda não existir) e coloque a linha:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=AIza...sua-chave...
   ```
4. Pare o servidor (Ctrl+C) e rode de novo limpando o cache: `npx expo start -c`

Sem a chave o app funciona igual, só que você monta o avatar manualmente e o Guia responde no modo básico.
> A chave grátis tem limite diário. Antes de publicar nas lojas, a chamada da IA precisa ir para um servidor (a chave não pode ficar dentro do app).

## 4. Roteiro de teste (10 minutos)

| # | O que fazer | O que deve acontecer |
|---|---|---|
| 1 | Capa → Pular → **Criar conta** | Abre a etapa 1: **Foto do seu pet** |
| 2 | Toque em **Galeria** e escolha uma foto do seu cachorro | “Lendo a foto…” e depois **Encontramos!** com raça, cor e o avatar |
| 3 | **Está certo, continuar** → nome, nascimento, peso | — |
| 4 | Ficha de saúde: 2 refeições e **300 g** por dia | Mostra “150 g em cada refeição” |
| 5 | Carimbos anteriores: Antirrábica **Já tomei → Mais de 1 ano**; Antipulgas **Ainda não** | — |
| 6 | Gerar → Abrir → Econômica | Início com **Tristinho**, card de **Peso** e ração “07:00 · 150 g” |
| 7 | **Carimbar** a Antipulgas → escolha **Ontem** | Folha “Quando o Toby tomou?”, depois o carimbo com a **Próxima dose** |
| 8 | Aba **Vacinas** → **Cronograma do ano**; toque numa vacina | Ficha com “O que é”, datas que tomou e as próximas |
| 9 | Aba **Diário** → **Passeio** → 1 hora + anotação | Entra no capítulo do mês com resumo |
| 10 | Aba **Vistos** | Cada vacina carimbada aparece como carimbo com a data |
| 11 | Guia IA: “a pata está vermelha” | Resposta da IA com carimbo de nível |
| 12 | Início → **Vou viajar** → Europa, data, avião | Checklist: o que tem, o que falta e até quando |
| 13 | Toque no card do pet → toque na **foto** | Trocar foto, galeria ou voltar ao avatar |
| 14 | **Dossiê para o veterinário** → Mostrar na tela | Resumo com vacinas, ração, peso e diário |
| 15 | Feche o app e abra de novo | Tudo continua salvo |

**Novidades desta versão:** Início com a **Rotina de hoje** (ração, água, passeios, brincar — tudo vai para o diário e, completa, vira carimbo "Rotina completa"); etapa **Como ele é** (porte, raças que puxou, jeito) e tela **Saúde da raça**; Guia IA com **microfone** (fale a pergunta) e botão **Ouvir**; aba **Vacinas** com "Tomou × Falta" e cronograma mês a mês; peso, diário e doses **editáveis** (toque para corrigir).

> Depois de copiar esta versão, rode **`npm install`** de novo (entraram pacotes de áudio e voz) e depois `npx expo start -c`.

**Lembretes (notificações):** Perfil → **Saúde e alimentação** → adicione um horário de ração **2 minutos à frente**. Os lembretes de vacina chegam às 09:00 (muda em Ajustes) nos dias antes do vencimento.

---

## 5. Ligar o Firebase (dados na nuvem)

1. Entre em https://console.firebase.google.com → **Adicionar projeto** → nome `pataporte` (pode desligar o Google Analytics).
2. Menu **Criação > Authentication** → **Vamos começar** → aba *Método de login* → **E-mail/senha** → Ativar → Salvar.
3. Menu **Criação > Firestore Database** → **Criar banco de dados** → local `southamerica-east1 (São Paulo)` → modo **produção**.
4. No Firestore, aba **Regras** → apague tudo, cole o conteúdo do arquivo `firestore.rules` desta pasta → **Publicar**.
5. Engrenagem ⚙ → **Configurações do projeto** → em *Seus apps*, clique no ícone **Web `</>`** → apelido `pataporte` → Registrar. Vai aparecer um bloco `firebaseConfig`.
6. Nesta pasta, copie `.env.example` para um arquivo novo chamado **`.env`** e preencha com os valores do `firebaseConfig`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=pataporte-xxxx.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=pataporte-xxxx
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=pataporte-xxxx.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```
7. Pare o servidor (Ctrl+C) e rode de novo limpando o cache:
   ```powershell
   npx expo start -c
   ```

Pronto: o aviso "Modo de teste" some do login, e as contas aparecem em *Authentication* e os dados em *Firestore* no console do Firebase. Tudo isso cabe no **plano gratuito (Spark)** do Firebase.

> As fotos do diário ficam salvas **no celular** (só o caminho vai para a nuvem), porque o Cloud Storage do Firebase hoje exige o plano pago.

---

## 6. O que é real e o que ainda é simulado

| Funciona de verdade | Simulado nesta versão |
|---|---|
| Conta com e-mail e senha (Firebase) | **Guia IA sem chave**: responde por regras (com a chave do Gemini vira IA de verdade) |
| Emissão do passaporte, avatar pela foto (Gemini), MRZ | **Pagamento** das classes (troca sem cobrar) |
| Itinerário, cronograma e carimbo com data | Regras de viagem: baseadas em 2026, confirmar com vet/consulado |
| Carimbar, milhas, vistos, sequência, check-in | Login com Google e Apple |
| Humor do avatar (feliz/neutro/tristinho) | Tutores compartilhados (Família) |
| Duty Free com acessórios no avatar | |
| Notificações locais (chamadas de embarque e ração) | |
| Diário de vida por mês, peso com gráfico, Vou viajar | |
| Dossiê em PDF (1ª Classe) e certificado com QR | |
| Emergência: abre o mapa com clínicas 24h | |

**Antes de publicar nas lojas** ainda faltam: IA real num servidor (Firebase Cloud Functions ou outro), cobrança real (RevenueCat + contas de desenvolvedor Apple/Google), a classe do usuário ser gravada pelo servidor (hoje o próprio app grava), login Google/Apple, e o build com `eas build`.

---

## 7. Estrutura do código

```
src/app/         telas (cada arquivo = uma tela; (tabs) = barra de couro)
src/domain/      regras: itinerário, milhas, vistos, humor, sequência, Duty Free, MRZ, guia
src/data/        Firebase + modo de teste local
src/art/         capa de couro, brasão, guilloché, roseta, carimbos, avatar
src/components/  botões, cartão de embarque, página de identificação, cabeçalhos
src/store/       estado central do app
src/services/    notificações, fotos, PDF
tests/           testes das regras (rode com: npm test)
```

Comandos úteis:

```powershell
npm test            # testes das regras de negócio
npm run typecheck   # verificação de tipos
npx expo start -c   # inicia limpando o cache
```

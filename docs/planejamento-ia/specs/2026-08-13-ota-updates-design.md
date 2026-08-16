# Design — Releases e atualização OTA

- **Data:** 2026-08-13
- **Status:** Aprovado, aguardando plano de implementação

## Contexto

O app não tem backend nem loja como canal rápido de correção — a estratégia de
distribuição já decidida (ver [ADR 0004](../../adr/0004-pivo-react-native.md))
inclui **EAS Update** justamente para permitir corrigir bugs de JS sem passar
por review de loja. Faltava: o processo de publicar essas atualizações
("releases") e o app efetivamente checar, baixar e aplicar uma atualização
disponível, avisando o usuário.

## Escopo

**Dentro do escopo:** atualizações **OTA (JavaScript-only)** via EAS Update —
checagem, download em segundo plano, aviso ao usuário, aplicação sob ação
explícita do usuário.

**Fora do escopo (decisão explícita):** detecção de atualização **nativa**
(nova versão de SDK, novo módulo nativo, exigindo reinstalação via
App Store/Play Store). Esse app tem poucos módulos nativos e nenhum backend —
o caso de "app desatualizado ao ponto de precisar de build nativa nova" é raro
o suficiente para não justificar o custo agora. Se isso mudar, é um design à
parte no futuro.

## Arquitetura

- **`expo-updates`** (módulo nativo) consultando um único branch/canal EAS
  Update: **`production`**. Sem canal de staging/preview por enquanto — YAGNI:
  nada hoje precisa de um canal separado, e criar um sem uso real é
  complexidade paga adiantada.
- **`runtimeVersion.policy: "appVersion"`** — política padrão recomendada pela
  Expo. Garante que uma atualização OTA só é oferecida a instalações rodando
  uma build nativa compatível; se um dia houver mudança nativa, o
  `runtimeVersion` muda junto com a versão do app e atualizações antigas
  continuam resolvendo corretamente para quem não atualizou a build nativa.
- `app.json`: adicionar o plugin `expo-updates`, `updates.checkAutomatically:
  "NEVER"` — o app controla ativamente quando checar (ver §Fluxo), em vez de
  depender do comportamento automático padrão do módulo (que checa apenas no
  cold start e aplica no próximo lançamento, sem opção de avisar o usuário
  antes).

## Publicação (releases)

- Novo workflow `.github/workflows/eas-update.yml`, gatilho: push em `main`.
- Passo principal: `eas update --branch production --non-interactive --message
  "<sha/commit>"`.
- Pré-requisitos que **exigem ação da conta do usuário** (não automatizáveis
  por mim, análogo ao `gh auth login` já feito para o repositório):
  1. `eas login` (ou `npx expo login`) — vincular o projeto a uma conta Expo.
  2. `eas init` / `eas update:configure` — cria o projeto EAS e escreve o
     `projectId`/`updates.url` em `app.json`.
  3. Gerar um `EXPO_TOKEN` (via `eas whoami --json` após login, ou no
     dashboard expo.dev) e cadastrá-lo como **secret do repositório GitHub**
     (`EXPO_TOKEN`), para o workflow autenticar sem login interativo.
- Sem versionamento por tag/changelog nesta primeira versão — cada push em
  `main` que passa no CI (lint+test) já é "a versão mais nova"; a mensagem do
  update é o SHA do commit, suficiente para rastrear o que foi publicado.

## Fluxo no app

1. **Quando checar:** no cold launch, e novamente quando o app volta ao
   primeiro plano (`AppState` → `active`), com throttle de 1 hora entre
   checagens — evita bater no CDN da EAS a cada troca rápida de app,
   consistente com a postura offline-first do app (checagem de rede é
   oportunista, nunca bloqueante).
2. **Checagem:** `Updates.checkForUpdateAsync()`. Se houver atualização,
   `Updates.fetchUpdateAsync()` baixa em segundo plano — o usuário não vê nada
   ainda.
3. **Aviso:** quando o download termina, um `updatesSlice` (Redux, mesmo
   padrão de `specSlice`/`anoLetivoSlice`/`materiasSlice` já existentes em
   `src/presentation/store/`) muda para `status: "pronta"`. Um componente
   `UpdateBanner` (não-bloqueante, dispensável) aparece com "Nova versão
   disponível" + botão "Atualizar agora".
4. **Aplicação:** só ao tocar no botão — `Updates.reloadAsync()`. **O app
   nunca recarrega sozinho.** Essa é a decisão central de UX aqui: R3 em
   `docs/ARQUITETURA.md` (nada que o usuário digitou pode se perder) já
   estabelece que o app pode ser encerrado pelo SO a qualquer momento sem
   avisar — um reload automático de atualização seria o próprio app impondo
   esse risco por vontade própria, o que é evitável e por isso não aceitável
   por padrão.

## Estados (`updatesSlice`)

```
"idle" → "checking" → "disponivel" → "baixando" → "pronta"
                    ↘ "idle" (nada disponível ou erro)
```

`erro` (string | null) acompanha o estado só para depuração futura — não é
exibido ao usuário (ver §Tratamento de erro).

## Tratamento de erro

Qualquer falha de checagem ou download (rede indisponível, EAS inacessível)
volta silenciosamente para `"idle"` — sem UI de erro, sem log visível ao
usuário. Consistente com a postura do app: uma checagem de atualização que
falha não é um problema do usuário, é o estado normal de "sem rede agora",
que já é o estado padrão deste app o tempo todo. Tentativa seguinte ocorre no
próximo ciclo (próximo foreground, respeitando o throttle).

## Testes

`expo-updates` é módulo nativo — não roda sob Jest. Estratégia:

- **Unitário:** o hook (`useAppUpdates`) é testado com `expo-updates` mockado
  via `jest.mock`, cobrindo as transições de estado descritas acima:
  idle→checking→disponivel→baixando→pronta, e checking→idle em caso de falha
  simulada (rejeitar a promise do mock).
- **Fora do alcance deste ambiente:** o ciclo real de publicar → checar →
  baixar → aplicar num dispositivo/build real não pode ser verificado aqui
  (sem simulador/dispositivo disponível). Fica documentado como verificação
  manual pós-implementação, a cargo do usuário, antes de considerar a feature
  "funcionando de ponta a ponta".

## Fora de escopo (explícito)

- Detecção/aviso de atualização **nativa** (ver §Escopo).
- Canal de staging/preview EAS Update.
- Changelog/versionamento por tag Git.
- Reload automático sem ação do usuário.

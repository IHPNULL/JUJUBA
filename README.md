<p align="center">
  <img src="assets/jujuba-icon.jpeg" alt="Jujuba" width="120" height="120" style="border-radius: 60px;" />
</p>

<h1 align="center">Jujuba</h1>
<p align="center"><strong>App de notas escolares — offline-first, iOS + Android</strong></p>

Aplicativo mobile para o aluno cadastrar as matérias do ano letivo, lançar notas por
período, ver a média calculada na hora e descobrir quanto falta tirar para passar.

Feito sob medida para o **formato de notas do Colégio Ser**: componentes AT, Objetiva,
SAEP e Tarefa por trimestre, com a fórmula oficial de média já embutida (ver
[Estado atual](#estado-atual)). A fórmula é dado, não código (
[ADR 0003](docs/adr/0003-formula-como-dado.md)), então adaptar para outra escola ou
regra é possível — mas hoje o app assume o Ser.

**Offline-first.** Nenhum dado sai do aparelho: sem conta, sem servidor, sem rede.

## Estado atual

✅ **Fórmula real implementada e tela Início funcionando**, seguindo o design do
mockup `Jujuba.dc.html`: cadastro de matérias (com suporte a 1 ou 2 "frentes" — notas
independentes dentro da mesma matéria, ex.: Física com Frente 1 e Frente 2), lançamento
de notas por trimestre, média calculada com precisão decimal exata (nunca ponto
flutuante nativo), simulador "quanto preciso tirar para bater a meta" e anel de
progresso com a média geral.

A fórmula de cálculo é tratada como *dado*, não como código — ver
[ADR 0003](docs/adr/0003-formula-como-dado.md). A fórmula real do **Colégio Ser** está
ativa (`specs/formula-real-trimestral.json`): `(AT×2 + Objetiva + SAEP) ÷ 4 + Tarefa`,
com teto de 10.

**Ainda não implementado:** persistência real (o schema Drizzle existe, a tela usa
Redux em memória por enquanto), onboarding de ano letivo, importação de prospecto,
backup/exportação.

## Instalar (Android)

A forma mais simples é baixar o `.apk` já compilado em
**[Releases](../../releases)** e instalar direto no aparelho — ver
[`docs/COMO-INSTALAR.md`](docs/COMO-INSTALAR.md) para o passo a passo (inclui como
liberar "fontes desconhecidas" no Android).

Para compilar você mesmo (não precisa de Android Studio local — o build roda na nuvem
via EAS):

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/COMO-INSTALAR.md`](docs/COMO-INSTALAR.md) | Como instalar o `.apk` no Android |
| [`docs/DEV-BUILD.md`](docs/DEV-BUILD.md) | Rodar no celular plugado, com recarga automática |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Camadas, modelo de domínio, persistência, telas, testes |
| [`docs/MOTOR-DE-FORMULA.md`](docs/MOTOR-DE-FORMULA.md) | Linguagem da fórmula, pipeline de avaliação, `GoalSolver` |
| [`docs/TECNOLOGIAS.md`](docs/TECNOLOGIAS.md) | Cada escolha de tecnologia, por quê, e o trade-off |
| [`docs/adr/`](docs/adr/) | Decisões arquiteturais registradas |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Specs de design de cada feature |
| [`specs/formula.schema.json`](specs/formula.schema.json) | Schema formal da `FormulaSpec` |

## Stack

- **React Native + Expo (managed)** — base única para iOS e Android (ver [ADR 0004](docs/adr/0004-pivo-react-native.md))
- **Drizzle ORM sobre `expo-sqlite`** — persistência local relacional, migrações versionadas
- **Redux Toolkit** — estado da aplicação
- **`decimal.js`** — toda nota é `Decimal`, nunca `number` nativo (ver [`docs/TECNOLOGIAS.md`](docs/TECNOLOGIAS.md))
- **EAS Build + EAS Update** — build em nuvem e atualização OTA sem passar pela loja
- Domínio em TypeScript puro, testável sem simulador

## Funcionalidades

- [x] Cadastro de matérias, com 1 ou 2 frentes
- [x] Lançamento de notas por componente (AT, Objetiva, SAEP, Tarefa) e por trimestre
- [x] Cálculo de média com a fórmula real, arredondamento decimal exato
- [x] Simulador "quanto preciso tirar para bater a meta" (por matéria e geral)
- [x] Meta de média ajustável
- [ ] Onboarding: ano letivo, tipo de período
- [ ] Persistência real (hoje o estado é só em memória — fecha o app, perde os dados)
- [ ] Importação e leitura do **prospecto** da escola
- [ ] Exportação e importação de backup (JSON)

## Como rodar (desenvolvimento)

```bash
npm install
npm run test
npx expo start
```

Para rodar no **celular plugado no computador**, com recarga automática a
cada alteração, ver [`docs/DEV-BUILD.md`](docs/DEV-BUILD.md):

```bash
npm run dev:build     # compila o development build na nuvem (uma vez)
npm run dev:install   # instala no aparelho plugado
npm run dev           # sobe o Metro e liga o celular pelo cabo
```

## Versão web (GitHub Pages)

A versão web roda em **[ihpnull.github.io/JUJUBA](https://ihpnull.github.io/JUJUBA/)**.
Todo push em `main` reexporta o app (`npm run build:web`, via
[`expo export --platform web`](https://docs.expo.dev/router/reference/static-rendering/))
e publica em Pages pelo workflow
[`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml).

Pra funcionar, o repositório precisa ter **Settings → Pages → Build and deployment →
Source: GitHub Actions** habilitado (passo manual único, feito uma vez).

## Atualizações OTA (EAS Update)

O app usa [EAS Update](https://docs.expo.dev/eas-update/introduction/) para publicar
atualizações OTA (over-the-air): todo push em `main` que passa no CI (lint + testes)
é publicado automaticamente para os apps já instalados, sem passar pela revisão da
loja — o usuário só aplica a atualização ao tocar em "Atualizar agora" no
`UpdateBanner`, nunca automaticamente (ver
[design spec](docs/superpowers/specs/2026-08-13-ota-updates-design.md)).

O projeto já está vinculado ao EAS (`app.json` → `extra.eas.projectId`). Falta só
cadastrar um `EXPO_TOKEN` como **secret do repositório GitHub** (gerado via
`eas whoami --json` ou no dashboard [expo.dev](https://expo.dev)) para o workflow
[`.github/workflows/eas-update.yml`](.github/workflows/eas-update.yml) publicar sem
login interativo.

## Estrutura

```
.
├── app/             app Expo Router (React Native + TypeScript)
├── src/             domain/data/presentation (ver ARQUITETURA.md)
├── assets/          ícones e imagens do app; brand/ guarda a arte-fonte
├── docs/            arquitetura, ADRs e specs de design
├── specs/           FormulaSpec: schema, exemplos e testes-golden
└── scripts/         automação de repositório e build
```

## Convenções

- Branch `main` protegida; trabalho em `feat/*`, `fix/*`, `docs/*`; merge via PR.
- Commits em [Conventional Commits](https://www.conventionalcommits.org/).
- Toda decisão arquitetural relevante vira um ADR em `docs/adr/`.
- Cobertura mínima de 90% em `src/domain/formula/`.
- Notas nunca em `number` nativo — sempre `Decimal` (ver `docs/TECNOLOGIAS.md`).

## Licença

MIT — ver [`LICENSE`](LICENSE).

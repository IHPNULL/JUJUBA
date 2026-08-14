# App de Notas Escolares

Aplicativo mobile (iOS + Android) para o aluno acompanhar as notas das matérias do ano
letivo, calcular médias e descobrir quanto precisa tirar para passar.

**Offline-first.** Nenhum dado sai do aparelho: sem conta, sem servidor, sem rede.

## Estado atual

🚧 **Início de implementação.** Shell do app (Expo Router + Redux Toolkit) e o motor
de fórmula (`src/domain/formula/`) já existem e passam nos testes-golden de
`specs/exemplo-media-bimestral.golden.json`. Telas de cadastro, persistência (schema
Drizzle definido, DAOs ainda não implementados) e o `GoalSolver` ainda faltam.

> ⚠️ A **fórmula de cálculo definitiva ainda não foi fornecida**. Por isso o cálculo é
> tratado como *dado* e não como código: ver [ADR 0003](docs/adr/0003-formula-como-dado.md).
> O app roda com uma regra provisória (`specs/exemplo-media-bimestral.json`) até lá.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Camadas, modelo de domínio, persistência, telas, testes, especificidades de iOS/Android |
| [`docs/MOTOR-DE-FORMULA.md`](docs/MOTOR-DE-FORMULA.md) | Linguagem da fórmula, pipeline de avaliação, `GoalSolver` |
| [`docs/adr/`](docs/adr/) | Decisões arquiteturais registradas |
| [`specs/formula.schema.json`](specs/formula.schema.json) | Schema formal da `FormulaSpec` |
| [`.claude/agents/arquiteto-mobile.md`](.claude/agents/arquiteto-mobile.md) | Agente especialista em arquitetura mobile |

## Stack

- **React Native + Expo (managed)** — base única para iOS e Android (ver [ADR 0004](docs/adr/0004-pivo-react-native.md))
- **Drizzle ORM sobre `expo-sqlite`** — persistência local relacional, migrações versionadas
- **Redux Toolkit** — estado e injeção de dependências
- Domínio em TypeScript puro, testável sem simulador

## Funcionalidades da v1

- [ ] Onboarding: ano letivo, tipo de período e **cadastro das matérias**
- [ ] Registro de avaliações e notas por matéria e período
- [ ] Autosave: nada do que for digitado é perdido
- [ ] Importação e leitura do **prospecto** da escola
- [ ] Cálculo de média e situação via `FormulaSpec`
- [ ] Simulador "quanto preciso tirar para passar"
- [ ] Exportação e importação de backup (JSON)

## Como rodar

```bash
npm install
npm run test
npx expo start
```

## Atualizações OTA (EAS Update)

O app usa [EAS Update](https://docs.expo.dev/eas-update/introduction/) para publicar
atualizações OTA (over-the-air): todo push em `main` que passa no CI (lint + testes)
é publicado automaticamente para os apps já instalados, sem passar pela revisão da
loja — o usuário só aplica a atualização ao tocar em "Atualizar agora" no
`UpdateBanner`, nunca automaticamente (ver
[design spec](docs/superpowers/specs/2026-08-13-ota-updates-design.md)).

Isso exige três passos manuais, únicos, antes do workflow
[`.github/workflows/eas-update.yml`](.github/workflows/eas-update.yml) funcionar:

1. `eas login` (ou `npx expo login`) — vincular o projeto a uma conta Expo.
2. `eas init` / `eas update:configure` — cria o projeto no EAS e preenche
   `extra.eas.projectId` e `updates.url` em `app.json` (hoje `app.json` tem um
   placeholder, `https://u.expo.dev/PROJECT_ID`, que precisa ser substituído por
   esse passo).
3. Gerar um `EXPO_TOKEN` (via `eas whoami --json` após login, ou no dashboard
   [expo.dev](https://expo.dev)) e cadastrá-lo como **secret do repositório GitHub**
   (`EXPO_TOKEN`), para o workflow publicar sem login interativo.

Sem esses três passos, o workflow falha na primeira execução.

## Estrutura

```
.
├── app/             app Expo Router (React Native + TypeScript)
├── src/             domain/data/presentation (ver ARQUITETURA.md)
├── docs/            arquitetura e ADRs
├── specs/           FormulaSpec: schema, exemplos e testes-golden
├── scripts/         automação de repositório e build
└── .claude/agents/  agente arquiteto mobile
```

## Convenções

- Branch `main` protegida; trabalho em `feat/*`, `fix/*`, `docs/*`; merge via PR.
- Commits em [Conventional Commits](https://www.conventionalcommits.org/).
- Toda decisão arquitetural relevante vira um ADR em `docs/adr/`.
- Cobertura mínima de 90% em `src/domain/formula/`.

## Licença

MIT — ver [`LICENSE`](LICENSE).

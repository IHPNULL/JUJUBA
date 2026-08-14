# ADR 0004 — Pivô de Flutter para React Native (Expo)

- **Status:** Aceito
- **Data:** 2026-08-13
- **Supersede:** [ADR 0001](0001-escolha-do-stack.md), [ADR 0002](0002-persistencia-local.md)

## Contexto

As restrições do app não mudaram desde a ADR 0001: iOS + Android, offline-first,
equipe pequena, UI predominantemente de formulários e tabelas, e uma regra de
cálculo que precisa produzir exatamente o mesmo número nas duas plataformas.
A escolha original foi Flutter/Dart. Decisão de negócio: trocar a base técnica
para **React Native**, priorizando o tamanho do pool de contratação (devs
JS/TS são mais abundantes que devs Dart) e a atualização OTA via EAS Update
sem passar por review de loja a cada correção.

## Decisão

**React Native + Expo (managed workflow)**, com as seguintes escolhas
acopladas, mantendo os mesmos princípios de arquitetura da ADR 0001/0002
(camadas isoladas, domínio puro testável, nota nunca em ponto flutuante
binário nativo):

| Camada | Antes (Flutter) | Agora (React Native) | Motivo da equivalência |
|---|---|---|---|
| Framework | Flutter 3.x / Dart | **React Native + Expo (managed)** | Expo resolve os módulos nativos (file picker, secure storage) sem código nativo próprio; bare RN seria reinventar isso sem ganho neste escopo |
| Persistência | Drift sobre SQLite | **Drizzle ORM sobre `expo-sqlite`** | Mesmo papel do Drift: SQL tipado, migrações versionadas e testáveis. Mais jovem que Drift — ver Consequências |
| Estado / DI | Riverpod | **Redux Toolkit** | Reducers puros testáveis fora da árvore de componentes; escolha do time por familiaridade, aceitando mais boilerplate por fluxo que uma alternativa atômica (Jotai) traria |
| Motor de fórmula | `expressions` (parser Dart) + whitelist | **`jsep` (parser JS) + avaliador com whitelist própria** | Mesmo desenho: AST sem `eval`, sem I/O, sem laço |
| Precisão numérica | `Decimal` (Dart) sobre inteiro escalado | **`decimal.js` sobre inteiro escalado** | Nem Dart nem JS têm decimal nativo — a mitigação real sempre foi o inteiro escalado, não a linguagem |
| Modelos | `freezed` + `json_serializable` | **Interfaces TypeScript + `zod`** | Imutabilidade por convenção (tipos `readonly`); `zod` cobre validação de schema em runtime nos limites (import de spec, formulários) |
| Navegação | `go_router` | **Expo Router** | Roteamento por arquivo, deep link, restauração de estado |
| Formulários | Widgets Flutter | **`react-hook-form` + `zod`** | UI é predominantemente formulário denso; minimiza re-render |
| Arquivos | `path_provider`, `file_picker` | **`expo-document-picker`, `expo-file-system`** | Mesmo fluxo: picker do SO → cópia para o container do app, sem pedir permissão de armazenamento |
| Backup | `share_plus` | **`expo-sharing` + `expo-file-system`** | Export/import de JSON, mesma lógica |
| Segredos | `flutter_secure_storage` | **`expo-secure-store`** | Keychain/Keystore, só entra se surgir dado sensível |
| Testes | `test`, `flutter_test`, `integration_test` | **Jest + React Native Testing Library** | Domínio em TS puro, testável em milissegundos sem simulador |
| CI/Build | GitHub Actions | **GitHub Actions + EAS Build** | Actions roda lint/test; EAS assina e builda sem exigir Xcode/Android Studio local por dev |

## Consequências

- (+) Pool de contratação maior (JS/TS é mais comum que Dart).
- (+) Atualização OTA de bugs via EAS Update sem review de loja para a maior
  parte das correções (mudanças que não tocam código nativo).
- (+) Princípios de arquitetura da ADR 0001 (camadas isoladas, domínio puro,
  fórmula como dado, nota como inteiro escalado) permanecem válidos — a
  troca é de linguagem/framework, não de desenho.
- (−) Drizzle + `expo-sqlite` é uma combinação mais jovem que Drift; menos
  testada em produção em larga escala. Risco aceito conscientemente em troca
  do pool de contratação.
- (−) Redux Toolkit é mais verboso por fluxo que a alternativa mais próxima
  do modelo anterior (Jotai, atômico, sem `BuildContext`/Provider tree — o
  paralelo mais direto ao Riverpod). Escolhido por preferência/familiaridade
  do time, não por superioridade técnica para este app.
- (−) Perde-se o argumento original "uma única fonte de bug de arredondamento
  porque só existe uma linguagem" apenas no sentido de que agora a stack é
  JS/TS de ponta a ponta ao invés de Dart de ponta a ponta — a garantia em si
  (motor de fórmula escrito uma única vez, rodando idêntico nas duas
  plataformas) continua de pé, só que em TypeScript.
- (−) Expo managed workflow tem menos controle nativo direto que Flutter
  caso surja necessidade futura de um módulo nativo não coberto pelo SDK
  Expo (mitigação: `expo prebuild`/EAS Build com config plugin, sem sair do
  managed workflow).

## Alternativas reconsideradas

Mesma análise da ADR 0001 quanto a Kotlin Multiplatform e nativo ×2 continua
válida e não é repetida aqui — nenhuma das duas restrições que as descartavam
mudou (custo de duas UIs; duplicação da regra de nota).

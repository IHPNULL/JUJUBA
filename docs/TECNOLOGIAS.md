# Tecnologias — escolha, motivo e trade-off

Cada linha responde três perguntas: **o que**, **por quê** e **o que se perde**.
A última coluna é a mais importante: é o custo de sair dessa escolha depois.

> Stack pivotada de Flutter para React Native — ver [ADR 0004](adr/0004-pivo-react-native.md).
> A versão anterior deste documento (Flutter/Dart) está preservada no histórico do git.

---

## 1. Framework — **React Native + Expo (managed workflow)**

**Por quê.** iOS + Android de uma base única, com o motor de fórmula escrito uma
única vez em TypeScript, rodando idêntico nas duas plataformas. Expo resolve os
módulos nativos necessários (document picker, secure storage, file system) sem
exigir código nativo próprio, e o EAS Update permite corrigir bugs de JS via OTA
sem passar pela review de loja. Prioriza pool de contratação (JS/TS é mais comum
que Dart) sobre o controle nativo mais fino que Flutter oferecia.

**Trade-off.** Managed workflow tem menos controle nativo direto — se surgir a
necessidade de um módulo fora do SDK Expo, o caminho é `expo prebuild`/config
plugin, não sair do ecossistema Expo de vez. Performance de listas muito grandes
e animações complexas pode exigir mais ajuste manual que em Flutter.

**Quando eu mudaria.** Se o app precisasse de widget de tela de bloqueio,
integração profunda com HealthKit/SiriKit, ou UI que precise ser indistinguível
da nativa → Kotlin Multiplatform com Compose + SwiftUI.

**Alternativas descartadas**

| | Por que não |
|---|---|
| Flutter | Foi a escolha original (ver ADR 0001, superada). Motor de fórmula em Dart puro era tecnicamente mais seguro (Drift é mais maduro que Drizzle), mas o pool de contratação Dart é menor que JS/TS. |
| Kotlin Multiplatform | Melhor resultado final, custo quase dobrado: duas UIs para manter num app que é essencialmente formulário. Overkill na v1. |
| Nativo ×2 (Swift + Kotlin) | Duas implementações da fórmula = duas fontes de bug num cálculo que decide se o aluno estuda ou não. Descartado por essa razão isolada. |

---

## 2. Persistência — **Drizzle ORM sobre `expo-sqlite`**

**Por quê.** O dado é relacional de ponta a ponta: ano → matérias → períodos →
avaliações → notas. Precisamos de agregações (média por período, por matéria, por
ano) e de migrações confiáveis, porque o usuário vai carregar dados de um ano para
o outro. Drizzle dá queries tipadas verificadas contra o schema, migrações
versionadas e testáveis, e roda sobre `expo-sqlite` (JSI, rápido, sem thread
bridge).

**Trade-off.** Combinação mais jovem que Drift (Dart) — menos testada em produção
em larga escala, comunidade menor, e alguns recursos (ex.: migrações totalmente
declarativas) ainda evoluindo. Depende de gerar migrações via `drizzle-kit` como
passo de build.

**Alternativas descartadas**

| | Por que não |
|---|---|
| `expo-sqlite` cru (sem ORM) | Sem verificação de schema em compile-time — um nome de coluna errado só falha em runtime/teste, exatamente o risco que não podemos correr no cálculo de nota. |
| WatermelonDB | Desenhado em torno de sincronização, que está fora do escopo. Paga complexidade sem usar o benefício. |
| Realm | Mesmo problema: o valor está em sync, que não está no escopo. |

**Decisão acoplada — notas nunca em `number` nativo.** São gravadas como inteiro
escalado (`valor_milis`: 8,75 → 8750) e manipuladas como `Decimal` (`decimal.js`)
no domínio. Ponto flutuante binário não representa 0,1 exatamente; num app onde
5,95 vira 6,0 ou 5,9 dependendo do arredondamento, isso é diferença entre aprovado
e reprovado. Essa decisão independe de linguagem — vale tanto para Dart quanto
para JS.

---

## 3. Estado e injeção — **Redux Toolkit**

**Por quê.** Reducers são funções puras testáveis fora de qualquer árvore de
componentes. Escolha do time por familiaridade com o modelo Redux.

**Trade-off.** Mais boilerplate por fluxo (action + reducer case) do que uma
alternativa atômica como Jotai traria para o mesmo comportamento — "editar uma
nota recalcula médias mostradas em outras telas". Jotai foi o paralelo mais
direto ao Riverpod (providers/atoms compostos, sem depender da árvore de
componentes) e ficou descartado aqui só por preferência, não por limitação
técnica.

**Alternativas descartadas.** Jotai (mais próximo do modelo anterior, descartado
por preferência do time). Context + `useReducer` puro não escala bem para estado
derivado amplamente compartilhado sem memoização cuidadosa. BLoC não existe fora
do mundo Flutter.

---

## 4. Motor de fórmula — **`jsep` (parser JS) + whitelist própria**

**Por quê.** A fórmula chega depois e vai mudar. Interpretá-la a partir de um JSON
declarativo permite trocar a regra sem release e sem review de loja, mantém o
histórico reprodutível (cada resultado guarda a versão da spec que o gerou) e
torna a regra *explicável* ao usuário na própria UI. `jsep` faz parse para AST sem
`eval`, e por cima dele colocamos uma whitelist de funções — uma spec maliciosa ou
malformada no máximo é rejeitada, nunca executa nada.

**Trade-off.** É o único componente que precisamos **construir**, não apenas
integrar: parser wrapper, validador semântico, cache de compilação e o
`GoalSolver`. Custo concentrado no início e exigência de cobertura acima de 90%.
Existe também o risco de a fórmula real pedir uma construção não prevista
(descarte da menor nota, média móvel) — mitigado por `schemaVersion` versionando
a própria linguagem.

**Alternativas descartadas.** Codificar a fórmula em TypeScript: cada mudança
viraria release + review, e o histórico ficaria impossível de recalcular.
Embarcar um interpretador mais pesado (ex.: um motor de regras genérico): peso e
superfície desproporcionais para o que é, no fim, aritmética com condicionais.

---

## 5. Demais escolhas

| Camada | Escolha | Por quê | Trade-off |
|---|---|---|---|
| Modelos | Interfaces TypeScript + `zod` | Tipagem estática, validação em runtime nos limites (import de spec, formulários), sem depender de codegen | `zod` schemas duplicam a forma do tipo TS se não gerados um do outro |
| Navegação | Expo Router | Deep link e restauração de estado — importante porque o app pode ser morto pelo SO a qualquer momento | Convenção por arquivo pode ficar rígida para rotas muito dinâmicas |
| Formulários | `react-hook-form` + `zod` | UI é predominantemente formulário denso; minimiza re-render, validação tipada | Curva de aprendizado da API de `register`/`Controller` |
| Arquivos | `expo-document-picker`, `expo-file-system` | Importação do prospecto via picker nativo do SO, **sem pedir permissão de armazenamento** | Comportamento pode variar entre iOS/Android; exige teste em device real |
| Backup | Export/import JSON via `expo-sharing` + `expo-file-system` | Portabilidade (LGPD) e proteção contra perda do aparelho, sem construir backend | Manual — o usuário precisa lembrar de fazer |
| Segredos | `expo-secure-store` | Keychain (iOS) / Keystore (Android) caso surja algo sensível | Hoje não há nada sensível; entra só se precisar |
| Testes | Jest, React Native Testing Library | Padrão do ecossistema; domínio puro roda em milissegundos sem simulador | Testes de UI em device real (Detox/Maestro) ficam para quando houver fluxos críticos de E2E |
| CI/Build | GitHub Actions + EAS Build | Actions roda lint/test em todo PR; EAS assina e builda sem exigir toolchain nativo local por dev | Minutos de build iOS na nuvem têm custo (EAS tem cota gratuita limitada) |

---

## 6. O que **não** entra na v1, e por quê

| Descartado | Motivo |
|---|---|
| Backend / API | Nenhum requisito pede. Backend traria conta, senha, LGPD, custo mensal e um modo de falha (offline) que hoje não existe. |
| Login / autenticação | O dado é de uma pessoa só, num aparelho só. Conta seria atrito puro no onboarding. |
| Sincronização em nuvem | Sincronizar é o problema difícil da computação distribuída. Backup manual resolve 90% do risco por 5% do esforço. iCloud/Drive ficam para a v2. |
| Analytics / crash reporting de terceiros | Cada SDK vira uma declaração no privacy manifest e no Data Safety. Começar em "Data Not Collected" acelera o review. |
| Notificações push | Exigiriam servidor. Lembretes locais (`expo-notifications`, modo local) cobrem o caso de uso se for preciso. |

---

## 7. Resumo em uma frase

**React Native (Expo) + SQLite/Drizzle + Redux Toolkit**, com a **regra de nota
como dado interpretado**, domínio em TypeScript puro e **zero rede** — porque o
risco real deste app não é escala nem performance, é calcular a nota errada e o
aluno perder o que já digitou.

# Design — Fórmula real, conceito de "frentes" e tela Início

- **Data:** 2026-08-14
- **Status:** Aprovado, aguardando plano de implementação

## Contexto

O mockup `Jujuba.dc.html` (importado do Claude Design, ver conversa) é um
protótipo interativo completo da tela inicial do app, com uma fórmula de
cálculo concreta embutida em JS. Três decisões já confirmadas com o usuário:

1. A fórmula do mockup é a **fórmula real**, não mais um placeholder —
   isso fecha a pendência da [ADR 0003](../adr/0003-formula-como-dado.md).
2. O mockup introduz **"frentes"** (uma matéria pode ter 1 ou 2 conjuntos de
   notas independentes, ex.: Física com "Frente 1"/"Frente 2") — vira
   conceito geral do domínio, não específico desse mockup.
3. Sequenciamento: as branches GoalSolver e Drizzle já foram mescladas
   (feito); a UI de onboarding/início do agente anterior foi descartada —
   esta spec cobre a reconstrução da tela seguindo o mockup.

## A fórmula real

Extraída do JS do mockup (`mediaOf`), com a matemática de ponto flutuante do
protótipo substituída pelo motor real (`Decimal`, sem `eval`, whitelist de
funções — ver [MOTOR-DE-FORMULA.md](../MOTOR-DE-FORMULA.md)):

```
mediaPeriodo = min(10, (at*2 + ao + saep) / 4 + tarefa)
```

- 4 componentes por frente por período: `at` (Avaliação Trimestral, peso
  efetivo 2, nota máxima 10), `ao` (Objetiva, nota máxima 10), `saep`
  (nota máxima 10), `tarefa` (nota máxima **1**, funciona como bônus
  aditivo, não como média ponderada).
- **3 períodos** (`periodos.tipo: "trimestre"`, `quantidade: 3`), não 4
  bimestres como a spec-placeholder (`exemplo-media-bimestral.json`) — a
  spec placeholder continua existindo como fixture de teste do motor, não
  é substituída, só deixa de ser a spec *ativa*.
- **Sem recuperação, sem critério fixo de aprovação/reprovação no
  mockup.** A "meta" (0–10, passo 0,5) é ajustável pelo usuário na própria
  tela, não uma constante da `FormulaSpec` — é comparação client-side
  (`média >= meta`), não um `criterios.aprovado` fixo por versão de spec.
  **Decisão de escopo:** esta spec NÃO define `criterios`/`situacao` para
  a nova `FormulaSpec` — isso fica para quando a tela de Matéria/detalhe
  precisar de um status persistido "aprovado/reprovado", fora do escopo
  atual (a tela Início só mostra médias numéricas e uma comparação visual
  com a meta).
- Nova spec: `specs/formula-real-trimestral.json` (nome provisório — ajustar
  se o usuário tiver um nome real da escola). `provisoria: false`.

## "Frentes" no domínio

Nova entidade `Frente`: `{ id, materiaId, ordem, nome }` (ex.: "Única",
"Frente 1", "Frente 2"). `Avaliacao` ganha `frenteId` (FK obrigatória) —
toda avaliação pertence a uma frente específica de uma matéria; matérias de
frente única têm exatamente uma `Frente` (nome "Única"), criada
automaticamente no cadastro.

Cálculo por matéria/período: a média do período de uma matéria é a **média
aritmética simples** das médias de período de cada uma de suas frentes
(`subjectMedia` no mockup) — isso é agregação acima do motor de fórmula
existente, não uma mudança em `avaliarAno`/`avaliarPeriodo`: cada frente
roda o motor independentemente (mesma `FormulaSpec`), e a agregação entre
frentes é lógica de domínio/usecase nova, simples (`soma / contagem`, sem
pesos).

Alcance desta spec para persistência: estender `schema.ts` (tabela
`frente`, coluna `frente_id` em `avaliacao`), `domain/entities/frente.ts`,
e o `AvaliacaoRepository`/mapper existentes para incluir `frenteId`. Não é
necessário construir um `FrenteRepository` completo com todas as operações
de CRUD nesta passada — o essencial é a matéria conseguir ter 1 ou 2
frentes cadastradas e a UI conseguir gravar/ler notas por frente. A tela
desta spec continua **Redux-only** para o estado de edição (mesmo padrão
já usado no onboarding anterior) — a integração da UI com o Drizzle é
trabalho futuro explícito, não desta passada.

## Tela Início (reconstrução)

Seguir o mockup `Jujuba.dc.html` com a maior fidelidade visual razoável em
React Native (adaptações onde CSS não tem equivalente direto):

- Header rosa (`#E31C79`) com ícone (`jujubaIcon.jpeg`), saudação, e chips
  de trimestre (1º/2º/3º Tri) roláveis horizontalmente.
- Cartão branco flutuante: anel de progresso circular (`react-native-svg`,
  nova dependência) mostrando a média geral do trimestre selecionado
  (média das médias de todas as matérias), stepper de meta (+/− em passos
  de 0,5), botão "Simular mínimo p/ X" (liga ao `GoalSolver` já
  implementado — adaptado para granularidade de componente, não só
  período, ver Riscos abaixo) e botão "Limpar" simulações.
- Grid de cartões por matéria: nome, indicador "2 frentes" quando
  aplicável, badge de média colorido (verde ≥ meta, vermelho < meta), 4
  campos de nota por frente (AT×2/Obj/SAEP/Tarefa) com `TextInput`
  (`inputmode` decimal, aceitando vírgula), dica textual ("faltam notas",
  "meta alcançada", "impossível atingir"), botão "Mínimo p/ X" por
  matéria.
- Botão flutuante "+" e bottom sheet para adicionar matéria (nome,
  1 ou 2 frentes, cor) — reaproveita a estrutura de formulário
  (`react-hook-form` + `zod`) do onboarding anterior, adaptada.
- Paleta de cores fixa (rosa/dourado/roxo) do mockup vira constantes
  compartilhadas (`src/presentation/shared/theme.ts` ou similar).

## Riscos / decisões em aberto para o plano

- **`GoalSolver` atual resolve no nível de período** (uma variável
  `periodo`/`recuperacao`), não no nível de componente individual
  (`at`/`ao`/`saep`/`tarefa` dentro de um período com campos vazios,
  distribuindo o déficit entre eles como o mockup faz em
  `minimumsFor`). Isso é uma extensão real do solver, não reaproveito
  direto — o plano de implementação precisa tratar isso como uma tarefa
  própria (um novo modo de resolução, não uma mudança no solver existente
  que já foi revisado e aprovado).
- `react-native-svg` é dependência nova — precisa entrar no plano como
  passo de instalação.
- Sem simulador disponível neste ambiente: como nas passadas anteriores,
  verificação via `tsc`/`eslint`/testes, sem checagem visual real.

## Fora de escopo (explícito)

- Integração da UI com persistência real (Drizzle) — Redux-only por ora.
- `criterios`/`situacao` (aprovado/reprovado) na nova `FormulaSpec`.
- Tela de Matéria/detalhe, Simulador dedicado, Prospecto, Ajustes.
- Frequência/recuperação (não existem no mockup nem na fórmula real).

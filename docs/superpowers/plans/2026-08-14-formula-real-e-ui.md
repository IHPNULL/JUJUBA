# Fórmula real, "frentes" e tela Início — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a fórmula placeholder pela fórmula real do mockup `Jujuba.dc.html`, adicionar "frentes" (1-2 conjuntos de notas independentes por matéria) como conceito de domínio, e reconstruir a tela Início para bater com o mockup, com cálculos passando pelo motor real (`Decimal`, sem `eval`) em vez da aritmética de ponto flutuante do protótipo.

**Architecture:** Extensão aditiva do motor de fórmula existente (`avaliarPeriodo` novo, `avaliarAno`/`resolverMeta` intocados), novo solver de componentes (`componentGoalSolver.ts`, separado do `goalSolver.ts` já revisado), extensão do schema Drizzle/domínio para `Frente`, e componentes de UI React Native que replicam o mockup, com estado Redux (sem persistência real nesta passada — mesmo padrão já usado no onboarding anterior).

**Tech Stack:** TypeScript, Decimal.js, jsep (motor já existente), Drizzle ORM, Redux Toolkit, React Native, `react-native-svg` (nova dependência), `react-hook-form` + `zod`.

**Spec:** [docs/superpowers/specs/2026-08-14-formula-real-e-ui.md](../specs/2026-08-14-formula-real-e-ui.md)

## Global Constraints

- Notas **nunca** em `number` nativo em código de domínio — sempre `Decimal` (decimal.js). Conversão para string/number só na fronteira de UI (exibição, `TextInput`).
- O motor de fórmula nunca usa `eval`; toda expressão passa por `avaliarExpressao` (jsep + whitelist), já existente e não deve ser modificado por este plano.
- `avaliarAno`, `resolverMeta` (goalSolver.ts) e `avaliarExpressao`/whitelist já foram revisados e aprovados em passada anterior — **não modificar**, apenas consumir. Qualquer extensão é aditiva em arquivo novo ou export novo.
- Domínio (`src/domain/**`) nunca importa de `src/data/**`, `drizzle-orm`, `expo-sqlite` ou React Native — regra já estabelecida em `docs/ARQUITETURA.md` §4.
- Esta passada é **Redux-only** para o estado de edição da tela Início — sem chamadas ao Drizzle a partir da UI. A extensão de schema/repositório para `Frente` (Task 4) prepara o terreno mas não é consumida pela UI ainda.
- Sem simulador disponível: verificação via `tsc --noEmit`, `eslint`, testes — sem checagem visual real.
- `criterios`/`situacao` (aprovado/reprovado persistido) **não fazem parte do escopo** da nova `FormulaSpec` nesta passada — a tela Início compara médias com a meta ajustável do usuário, não com um critério fixo da spec.

---

### Task 1: FormulaSpec real + fixtures golden

**Files:**
- Create: `specs/formula-real-trimestral.json`
- Create: `specs/formula-real-trimestral.golden.json`

**Interfaces:**
- Produces: a `FormulaSpec` JSON (schema em `specs/formula.schema.json`, tipo TS em `src/domain/formula/types.ts`) e fixtures golden consumidos pelo teste da Task 2.

- [ ] **Step 1: Criar a FormulaSpec real**

```json
{
  "schemaVersion": 1,
  "id": "real-trimestral-v1",
  "versao": 1,
  "nome": "Média trimestral (AT dobrada + Objetiva + SAEP, com bônus de tarefa)",
  "descricao": "Fórmula real: (AT×2 + Objetiva + SAEP) / 4 + Tarefa, limitada a 10. Extraída do mockup Jujuba.dc.html.",
  "provisoria": false,
  "periodos": { "tipo": "trimestre", "quantidade": 3, "rotulos": ["1º Tri", "2º Tri", "3º Tri"] },
  "escala": { "min": 0, "max": 10, "casasDecimais": 1, "arredondamento": "half_up" },
  "componentes": [
    { "id": "at", "rotulo": "AT", "peso": 2, "notaMaxima": 10, "obrigatorio": true },
    { "id": "ao", "rotulo": "Objetiva", "peso": 1, "notaMaxima": 10 },
    { "id": "saep", "rotulo": "SAEP", "peso": 1, "notaMaxima": 10 },
    { "id": "tarefa", "rotulo": "Tarefa", "peso": 1, "notaMaxima": 1 }
  ],
  "calculos": {
    "mediaPeriodo": "min(10, (at * 2 + ao + saep) / 4 + tarefa)",
    "mediaFinal": "media(periodos)"
  },
  "criterios": {
    "aprovado": "mediaFinal >= 6"
  },
  "meta": { "notaParaAprovacao": 6.0, "fonte": "mockup Jujuba.dc.html — meta de aprovação ajustável pelo usuário na UI, este valor é só o default do critério (não usado pela tela Início nesta passada)." }
}
```

Nota importante para quem implementar: `peso` em cada componente é só metadado descritivo (reflete o coeficiente bruto antes da divisão por 4: `at` tem peso 2 porque aparece como `at * 2` no numerador). `calculos.mediaPeriodo` referencia os componentes **diretamente pelo id** (`at`, `ao`, `saep`, `tarefa`) como identificadores na expressão — não usa `somaPonderada`/`somaPesos` (essas funções da whitelist existem para specs que preferem expressar a fórmula como soma ponderada genérica; esta spec expressa a fórmula literal, que é o jeito mais direto de representar exatamente `(at*2+ao+saep)/4+tarefa`). `criterios.aprovado` é exigido pelo schema (`specs/formula.schema.json`) mas não é consumido pela UI desta passada — só existe para a spec ser válida.

- [ ] **Step 2: Validar contra o schema**

Run: `node -e "const Ajv=require('ajv'); " 2>&1 || true` — não há validador JSON Schema instalado no projeto; validar manualmente lendo `specs/formula.schema.json` e conferindo campo a campo contra o JSON acima (já foi conferido ao escrever este plano: todos os campos obrigatórios de `periodos`, `escala`, `componentes[]`, `calculos`, `criterios` estão presentes; `periodos.tipo: "trimestre"` está no enum permitido).

- [ ] **Step 3: Criar as fixtures golden**

Estas fixtures testam `avaliarPeriodo` (Task 2), não `avaliarAno` — por isso o formato é diferente de `specs/exemplo-media-bimestral.golden.json` (que testa o ano inteiro). Cada caso tem os 4 componentes e o `mediaPeriodo` esperado, calculado à mão:

```json
[
  {
    "nome": "matemática 1º tri — SAEP não lançado",
    "entrada": { "at": 8.5, "ao": 7, "saep": 0, "tarefa": 1 },
    "esperado": 7.0
  },
  {
    "nome": "física frente 1 — todos os campos preenchidos",
    "entrada": { "at": 7, "ao": 6.5, "saep": 7, "tarefa": 0.5 },
    "esperado": 7.4
  },
  {
    "nome": "física frente 2 — objetiva e SAEP não lançados",
    "entrada": { "at": 8, "ao": 0, "saep": 0, "tarefa": 1 },
    "esperado": 5.0
  },
  {
    "nome": "português — arredondamento half_up na fronteira",
    "entrada": { "at": 9, "ao": 8, "saep": 7.5, "tarefa": 1 },
    "esperado": 9.4
  },
  {
    "nome": "nota máxima em tudo — teto de 10 aplicado",
    "entrada": { "at": 10, "ao": 10, "saep": 10, "tarefa": 1 },
    "esperado": 10.0
  }
]
```

Conferência manual de cada caso (para quem revisar): caso 1: `(8.5*2+7+0)/4+1 = 24/4+1 = 7.0`. Caso 2: `(7*2+6.5+7)/4+0.5 = 27.5/4+0.5 = 6.875+0.5 = 7.375`, arredonda half_up 1 casa → `7.4`. Caso 3: `(8*2+0+0)/4+1 = 16/4+1 = 5.0`. Caso 4: `(9*2+8+7.5)/4+1 = 33.5/4+1 = 8.375+1 = 9.375` → `9.4`. Caso 5: `(10*2+10+10)/4+1 = 40/4+1 = 11`, `min(10,11) = 10.0`.

- [ ] **Step 4: Commit**

```bash
git add specs/formula-real-trimestral.json specs/formula-real-trimestral.golden.json
git commit -m "feat: add real FormulaSpec (trimestral, AT×2+Obj+SAEP+tarefa)"
```

---

### Task 2: `avaliarPeriodo` e `mediaEntreFrentes` no motor de cálculo

**Files:**
- Modify: `src/domain/formula/motorDeCalculo.ts`
- Create: `src/domain/formula/motorDeCalculo.periodo.test.ts`

**Interfaces:**
- Consumes: `avaliarExpressao` de `./avaliador` (já importado no arquivo), tipos de `./types`, fixtures da Task 1 (`specs/formula-real-trimestral.json`, `specs/formula-real-trimestral.golden.json`).
- Produces:
  - `avaliarPeriodo(spec: FormulaSpec, componentes: Record<string, Decimal>): Decimal` — `componentes` precisa ter uma entrada `Decimal` para cada `spec.componentes[].id` (quem chama é responsável por usar `Decimal(0)` para um componente ainda não digitado — a função não trata `null`/ausência especialmente, deixa o erro de identificador-ausente já existente em `avaliarExpressao` disparar se faltar algo).
  - `mediaEntreFrentes(medias: Decimal[]): Decimal` — média aritmética simples, sem arredondamento (quem chama arredonda para exibição via `arredondarNaEscala` se precisar). Lança `FormulaError` se `medias` estiver vazio.
- Não modifica `avaliarAno`, `EntradaAnual`, `avaliarSituacao` nem `arredondarNaEscala` (só reaproveita `arredondarNaEscala` e o helper privado `comoDecimalObrigatorio` já existentes no arquivo).

- [ ] **Step 1: Escrever os testes (a partir das fixtures golden)**

```typescript
// src/domain/formula/motorDeCalculo.periodo.test.ts
import Decimal from "decimal.js";
import { avaliarPeriodo, mediaEntreFrentes } from "./motorDeCalculo";
import { FormulaSpec } from "./types";
import spec from "../../../specs/formula-real-trimestral.json";
import goldens from "../../../specs/formula-real-trimestral.golden.json";

interface CasoGolden {
  nome: string;
  entrada: { at: number; ao: number; saep: number; tarefa: number };
  esperado: number;
}

describe("avaliarPeriodo — specs/formula-real-trimestral", () => {
  test.each(goldens as CasoGolden[])("$nome", ({ entrada, esperado }) => {
    const componentes = {
      at: new Decimal(entrada.at),
      ao: new Decimal(entrada.ao),
      saep: new Decimal(entrada.saep),
      tarefa: new Decimal(entrada.tarefa),
    };
    const resultado = avaliarPeriodo(spec as FormulaSpec, componentes);
    expect(resultado.toNumber()).toBe(esperado);
  });
});

describe("mediaEntreFrentes", () => {
  it("calcula a média aritmética simples entre frentes", () => {
    const resultado = mediaEntreFrentes([new Decimal("7.4"), new Decimal("5.0")]);
    expect(resultado.toNumber()).toBe(6.2);
  });

  it("funciona com uma única frente (matéria de frente única)", () => {
    const resultado = mediaEntreFrentes([new Decimal("8.3")]);
    expect(resultado.toNumber()).toBe(8.3);
  });

  it("lança FormulaError se a lista estiver vazia", () => {
    expect(() => mediaEntreFrentes([])).toThrow("mediaEntreFrentes");
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx jest src/domain/formula/motorDeCalculo.periodo.test.ts`
Expected: FAIL — `avaliarPeriodo`/`mediaEntreFrentes` não existem ainda (erro de import/undefined).

- [ ] **Step 3: Implementar**

Adicionar ao import existente no topo de `src/domain/formula/motorDeCalculo.ts` (que hoje importa `Arredondamento, ContextoDeCalculo, Escala, FormulaSpec, ResultadoCalculado, Situacao` de `./types`) o tipo `FormulaError`:

```typescript
import {
  Arredondamento,
  ContextoDeCalculo,
  Escala,
  FormulaError,
  FormulaSpec,
  ResultadoCalculado,
  Situacao,
} from "./types";
```

E acrescentar ao final do arquivo (depois de `avaliarAno`, antes ou depois de `avaliarSituacao`/`comoDecimalObrigatorio` — a ordem não importa, mas mantenha `avaliarAno` e sua lógica intocados):

```typescript
/**
 * Avalia `calculos.mediaPeriodo` para uma frente/período específico, a
 * partir dos componentes já digitados. `componentes` precisa ter uma
 * entrada `Decimal` para cada `spec.componentes[].id` — quem chama decide
 * como tratar um campo ainda não digitado (esta tela usa `Decimal(0)`,
 * espelhando o comportamento do mockup `Jujuba.dc.html`, onde um campo
 * vazio conta como zero na média ao vivo).
 */
export function avaliarPeriodo(spec: FormulaSpec, componentes: Record<string, Decimal>): Decimal {
  const contexto: ContextoDeCalculo = { ...componentes };
  const bruto = comoDecimalObrigatorio(
    avaliarExpressao(spec.calculos.mediaPeriodo, contexto),
    "mediaPeriodo"
  );
  return arredondarNaEscala(bruto, spec.escala);
}

/**
 * Média aritmética simples entre as médias de período das frentes de uma
 * matéria (uma matéria de frente única tem sempre length 1). Sem pesos —
 * cada frente conta igual, espelhando `subjectMedia` do mockup. Não
 * arredonda: quem exibe decide a precisão.
 */
export function mediaEntreFrentes(medias: Decimal[]): Decimal {
  if (medias.length === 0) {
    throw new FormulaError("mediaEntreFrentes: precisa de pelo menos uma frente");
  }
  const soma = medias.reduce((acumulado, media) => acumulado.plus(media), new Decimal(0));
  return soma.div(medias.length);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx jest src/domain/formula/motorDeCalculo.periodo.test.ts src/domain/formula/motorDeCalculo.golden.test.ts`
Expected: PASS em ambos os arquivos (o golden existente não pode quebrar).

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/domain/formula`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/domain/formula/motorDeCalculo.ts src/domain/formula/motorDeCalculo.periodo.test.ts
git commit -m "feat: add avaliarPeriodo and mediaEntreFrentes to motorDeCalculo"
```

---

### Task 3: Solver de componentes (`componentGoalSolver.ts`)

**Files:**
- Create: `src/domain/formula/componentGoalSolver.ts`
- Create: `src/domain/formula/componentGoalSolver.test.ts`

**Interfaces:**
- Consumes: `avaliarPeriodo` da Task 2, `ComponenteSpec`/`FormulaError`/`FormulaSpec` de `./types`.
- Produces: `resolverMinimosComponentes(spec: FormulaSpec, preenchidos: Record<string, Decimal | null>, meta: Decimal): ResultadoMinimosComponentes`, onde `preenchidos` tem uma entrada por `spec.componentes[].id` (`Decimal` se já digitado, `null` se vazio — o solver resolve os vazios) e:

```typescript
export type ResultadoMinimosComponentes =
  | { tipo: "semVazios" }
  | { tipo: "jaAlcancado"; valores: Record<string, Decimal> }
  | { tipo: "valores"; valores: Record<string, Decimal> }
  | { tipo: "impossivel"; melhorPossivel: Decimal };
```

Este é um solver **separado** do `goalSolver.ts` já revisado (que resolve no nível de período/ano via bisseção) — não o modifica, não reaproveita sua lógica interna. Resolve no nível de **componente dentro de um período** (ex.: "AT e Objetiva ainda não lançados nesta frente, quanto preciso tirar em cada um para bater a meta?"), distribuindo o déficit proporcionalmente entre os campos vazios — mesmo comportamento do `minimumsFor` do mockup, mas com `Decimal` e arredondamento seguro (sempre para cima, nunca sugere um valor que ficaria abaixo da meta depois de arredondado).

**Algoritmo (documentar isso como comentário no arquivo, é a parte não óbvia):** a fórmula é linear em cada componente (exceto o teto `min(10, ...)`), mas o solver não assume isso lendo a expressão — ele **sonda** o coeficiente de cada componente vazio avaliando `avaliarPeriodo` duas vezes (componente em 0, componente no próprio máximo, demais fixos), na mesma linha do princípio "fórmula como dado" que já rege o resto do motor. Isso mantém o solver genérico o suficiente para specs futuras com pesos diferentes, sem precisar hardcodar a forma exata de `(at*2+ao+saep)/4+tarefa`.

- [ ] **Step 1: Escrever os testes**

```typescript
// src/domain/formula/componentGoalSolver.test.ts
import Decimal from "decimal.js";
import { resolverMinimosComponentes } from "./componentGoalSolver";
import { FormulaSpec } from "./types";
import spec from "../../../specs/formula-real-trimestral.json";

const specTipada = spec as FormulaSpec;

describe("resolverMinimosComponentes — specs/formula-real-trimestral", () => {
  it("retorna 'semVazios' quando todos os componentes já foram digitados", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: new Decimal(8), ao: new Decimal(7), saep: new Decimal(7), tarefa: new Decimal(1) },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("semVazios");
  });

  it("retorna 'jaAlcancado' quando o preenchido já bate a meta mesmo com vazios em zero", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: new Decimal(10), ao: new Decimal(10), saep: null, tarefa: new Decimal(1) },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("jaAlcancado");
    if (resultado.tipo === "jaAlcancado") {
      expect(resultado.valores.saep.toNumber()).toBe(0);
    }
  });

  it("distribui o déficit proporcionalmente entre AT e Objetiva vazios (SAEP=7, Tarefa=0,5, meta=7)", () => {
    // `have` vem de avaliarPeriodo, que SEMPRE arredonda (Task 2) — não é
    // 2.25 (bruto), é 2.3 (2.25 arredondado half_up a 1 casa). A partir daí:
    // coef(at) = (avaliarPeriodo({at:10,ao:0,saep:7,tarefa:0.5}) - have)/10
    //          = (7.3 - 2.3)/10 = 0.5   [avaliarPeriodo({at:10,...}) = 7.25 -> 7.3]
    // coef(ao) = (avaliarPeriodo({at:0,ao:10,saep:7,tarefa:0.5}) - have)/10
    //          = (4.8 - 2.3)/10 = 0.25  [avaliarPeriodo({ao:10,...}) = 4.75 -> 4.8]
    // capacidade = 0.5*10 + 0.25*10 = 7.5; déficit = 7 - 2.3 = 4.7
    // x = 4.7/7.5 = 0.62666...; valor bruto = x*10 = 6.2666... -> arredonda p/ cima 1 casa: 6.3
    // Verificação (o solver faz isso internamente, ver Step 3): avaliarPeriodo
    // com at=ao=6.3 dá (12.6+6.3+7)/4+0.5 = 6.975 -> arredonda para 7.0 >= meta. Confirma 6.3 sem precisar subir mais.
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(7), tarefa: new Decimal("0.5") },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("valores");
    if (resultado.tipo === "valores") {
      expect(resultado.valores.at.toNumber()).toBe(6.3);
      expect(resultado.valores.ao.toNumber()).toBe(6.3);
    }
  });

  it("o valor sugerido, aplicado de volta, realmente bate a meta (nunca fica abaixo por causa do arredondamento)", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(7), tarefa: new Decimal("0.5") },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("valores");
    if (resultado.tipo === "valores") {
      const { avaliarPeriodo } = jest.requireActual("./motorDeCalculo");
      const mediaComSugestao = avaliarPeriodo(specTipada, {
        at: resultado.valores.at,
        ao: resultado.valores.ao,
        saep: new Decimal(7),
        tarefa: new Decimal("0.5"),
      });
      expect(mediaComSugestao.gte(new Decimal(7))).toBe(true);
    }
  });

  it("retorna 'impossivel' quando nem com nota máxima nos vazios a meta é alcançável", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(0), tarefa: new Decimal(0) },
      new Decimal(10)
    );
    // have=0; capacidade = 0.5*10+0.25*10 = 7.5; déficit=10 > 7.5
    expect(resultado.tipo).toBe("impossivel");
    if (resultado.tipo === "impossivel") {
      expect(resultado.melhorPossivel.toNumber()).toBe(7.5);
    }
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx jest src/domain/formula/componentGoalSolver.test.ts`
Expected: FAIL — módulo não existe ainda.

- [ ] **Step 3: Implementar**

```typescript
// src/domain/formula/componentGoalSolver.ts
import Decimal from "decimal.js";
import { avaliarPeriodo } from "./motorDeCalculo";
import { ComponenteSpec, Escala, FormulaError, FormulaSpec } from "./types";

/**
 * Solver de "quanto preciso tirar" no nível de COMPONENTE dentro de um
 * período (ex.: AT e Objetiva ainda não lançados nesta frente) — diferente
 * do `goalSolver.ts` (nível de período/ano, bisseção). Não modifica nem
 * reaproveita `goalSolver.ts`.
 *
 * Algoritmo: para cada componente vazio, sonda seu coeficiente na fórmula
 * avaliando `avaliarPeriodo` com o componente em 0 e no próprio máximo
 * (demais fixos) — `coef = (f(max) - f(0)) / max`. Isso mantém o solver
 * agnóstico à forma exata da expressão (mesmo princípio de "fórmula como
 * dado" do resto do motor), ao custo de assumir que a fórmula é
 * aproximadamente linear em cada componente dentro do intervalo sondado —
 * uma suposição segura aqui porque a única não-linearidade da fórmula real
 * é o teto `min(10, ...)`, e subestimar o coeficiente por causa do teto só
 * faz o solver pedir MAIS do que o estritamente necessário, nunca menos.
 *
 * Distribuição do déficit entre vazios: mesmo comportamento do
 * `minimumsFor` do mockup — todos os campos vazios recebem a MESMA fração
 * `x` do próprio valor máximo (não uma fração do déficit), onde `x` é
 * escolhido para que a soma pondera da pelos coeficientes feche o déficit
 * exatamente. Resultado sempre arredondado PARA CIMA na escala (nunca
 * sugerir um valor que, arredondado para baixo, ficaria abaixo da meta).
 */

export type ResultadoMinimosComponentes =
  | { tipo: "semVazios" }
  | { tipo: "jaAlcancado"; valores: Record<string, Decimal> }
  | { tipo: "valores"; valores: Record<string, Decimal> }
  | { tipo: "impossivel"; melhorPossivel: Decimal };

export function resolverMinimosComponentes(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  meta: Decimal
): ResultadoMinimosComponentes {
  const vazios = spec.componentes.filter(
    (componente) => preenchidos[componente.id] === null || preenchidos[componente.id] === undefined
  );

  if (vazios.length === 0) {
    return { tipo: "semVazios" };
  }

  const baseComVaziosEmZero = construirContexto(spec, preenchidos, vazios, () => new Decimal(0));
  const have = avaliarPeriodo(spec, baseComVaziosEmZero);

  const coeficientes = new Map<string, Decimal>();
  for (const vazio of vazios) {
    const notaMaxima = notaMaximaObrigatoria(vazio);
    const comMaximo = { ...baseComVaziosEmZero, [vazio.id]: notaMaxima };
    const valorComMaximo = avaliarPeriodo(spec, comMaximo);
    coeficientes.set(vazio.id, valorComMaximo.minus(have).div(notaMaxima));
  }

  const capacidade = vazios.reduce(
    (acumulado, componente) =>
      acumulado.plus(coeficientes.get(componente.id)!.times(notaMaximaObrigatoria(componente))),
    new Decimal(0)
  );

  const deficit = meta.minus(have);

  if (deficit.lte(0)) {
    const valores: Record<string, Decimal> = {};
    vazios.forEach((componente) => {
      valores[componente.id] = new Decimal(0);
    });
    return { tipo: "jaAlcancado", valores };
  }

  if (capacidade.lte(0) || deficit.gt(capacidade)) {
    const melhorPossivel = avaliarPeriodo(
      spec,
      construirContexto(spec, preenchidos, vazios, (componente) => notaMaximaObrigatoria(componente))
    );
    return { tipo: "impossivel", melhorPossivel };
  }

  const x = deficit.div(capacidade);
  const valores: Record<string, Decimal> = {};
  for (const vazio of vazios) {
    const notaMaxima = notaMaximaObrigatoria(vazio);
    const bruto = x.times(notaMaxima);
    const arredondadoParaCima = arredondarParaCimaNaEscala(bruto, spec.escala);
    valores[vazio.id] = Decimal.min(Decimal.max(arredondadoParaCima, new Decimal(0)), notaMaxima);
  }

  return ajustarAteVerificar(spec, preenchidos, vazios, valores, meta);
}

/**
 * `have`/`coeficientes`/`capacidade` são construídos a partir de
 * `avaliarPeriodo`, que SEMPRE arredonda (Task 2) — então o `x` calculado
 * acima é uma estimativa sobre valores já arredondados, não sobre a
 * aritmética exata. Isso pode, em tese, sugerir um valor que — depois de
 * recalculado pelo `avaliarPeriodo` real com os componentes preenchidos —
 * fica um pouquinho abaixo da meta. Em vez de confiar cegamente na
 * estimativa linear, verifica contra o avaliador de verdade (o mesmo
 * princípio do `goalSolver.ts`: nunca confiar no modelo, confiar no
 * resultado real) e sobe um passo de escala por vez, em todos os vazios
 * simultaneamente, até bater a meta de verdade ou esgotar o intervalo.
 */
function ajustarAteVerificar(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  vazios: ComponenteSpec[],
  valoresIniciais: Record<string, Decimal>,
  meta: Decimal
): ResultadoMinimosComponentes {
  const valores = { ...valoresIniciais };
  const passoDaEscala = new Decimal(10).pow(-spec.escala.casasDecimais);
  const MAX_TENTATIVAS = 50;

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const resultado = avaliarPeriodo(spec, construirContexto(spec, preenchidos, vazios, (c) => valores[c.id]));
    if (resultado.gte(meta)) {
      return { tipo: "valores", valores };
    }
    let algumSubiu = false;
    for (const vazio of vazios) {
      const notaMaxima = notaMaximaObrigatoria(vazio);
      if (valores[vazio.id].lt(notaMaxima)) {
        valores[vazio.id] = Decimal.min(valores[vazio.id].plus(passoDaEscala), notaMaxima);
        algumSubiu = true;
      }
    }
    if (!algumSubiu) break;
  }

  // Todos os vazios já no máximo (ou MAX_TENTATIVAS esgotado) e ainda não
  // basta — a estimativa linear divergiu demais do real. Reporta o melhor
  // resultado genuíno possível em vez de um valor "sugerido" que não entrega.
  const melhorPossivel = avaliarPeriodo(
    spec,
    construirContexto(spec, preenchidos, vazios, (componente) => notaMaximaObrigatoria(componente))
  );
  return { tipo: "impossivel", melhorPossivel };
}

function construirContexto(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  vazios: ComponenteSpec[],
  valorParaVazio: (componente: ComponenteSpec) => Decimal
): Record<string, Decimal> {
  const idsVazios = new Set(vazios.map((componente) => componente.id));
  const contexto: Record<string, Decimal> = {};
  for (const componente of spec.componentes) {
    contexto[componente.id] = idsVazios.has(componente.id)
      ? valorParaVazio(componente)
      : (preenchidos[componente.id] ?? new Decimal(0));
  }
  return contexto;
}

function notaMaximaObrigatoria(componente: ComponenteSpec): Decimal {
  if (componente.notaMaxima === undefined) {
    throw new FormulaError(`Componente "${componente.id}" precisa de notaMaxima para o solver de componentes`);
  }
  return new Decimal(componente.notaMaxima);
}

function arredondarParaCimaNaEscala(valor: Decimal, escala: Escala): Decimal {
  return valor.toDecimalPlaces(escala.casasDecimais, Decimal.ROUND_CEIL);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx jest src/domain/formula/componentGoalSolver.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/domain/formula`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/domain/formula/componentGoalSolver.ts src/domain/formula/componentGoalSolver.test.ts
git commit -m "feat: add component-level goal solver (resolverMinimosComponentes)"
```

---

### Task 4: "Frente" no domínio e na persistência

**Files:**
- Create: `src/domain/entities/frente.ts`
- Modify: `src/domain/entities/avaliacao.ts`
- Modify: `src/domain/entities/index.ts`
- Modify: `src/data/local/db/schema.ts`
- Create: `src/domain/repositories/frenteRepository.ts`
- Modify: `src/domain/repositories/index.ts`
- Create: `src/data/mappers/frenteMapper.ts`
- Modify: `src/data/mappers/index.ts`
- Modify: `src/data/mappers/avaliacaoMapper.ts`
- Create: `src/data/repositories/frenteRepositoryDrizzle.ts`
- Modify: `src/data/repositories/index.ts`
- Create: `src/data/repositories/frenteRepositoryDrizzle.test.ts`
- (gerado) `src/data/local/db/migrations/` — nova migração via `drizzle-kit generate`

**Interfaces:**
- Consumes: `AppDatabase` de `../local/db/client` (padrão já usado por `MateriaRepositoryDrizzle` etc.), `createTestDatabase()` de `../local/db/testClient` (para o teste).
- Produces: entidade `Frente`, `FrenteRepository` (`criar`, `listarPorMateria` — CRUD mínimo, não completo, ver spec), `Avaliacao.frenteId: string` (campo novo, obrigatório).

- [ ] **Step 1: Entidade `Frente`**

```typescript
// src/domain/entities/frente.ts
/**
 * 1 ou 2 conjuntos de notas independentes dentro de uma matéria (ex.:
 * Física com "Frente 1"/"Frente 2"). Matérias de frente única têm
 * exatamente uma `Frente` (nome "Única"), criada junto com a matéria — ver
 * docs/superpowers/specs/2026-08-14-formula-real-e-ui.md.
 */
export interface Frente {
  id: string;
  materiaId: string;
  ordem: number;
  nome: string;
}
```

- [ ] **Step 2: `Avaliacao` ganha `frenteId`**

Em `src/domain/entities/avaliacao.ts`, adicionar o campo `frenteId: string;` à interface `Avaliacao`, logo após `materiaId`:

```typescript
export interface Avaliacao {
  id: string;
  materiaId: string;
  frenteId: string;
  periodoId: string;
  titulo: string;
  tipoId: string;
  peso: number;
  notaMaxima: Decimal;
  data: string | null;
  obrigatoria: boolean;
}
```

(Resto do arquivo — `AvaliacaoComNotas`, o comentário de topo — permanece igual.)

- [ ] **Step 3: Exportar `Frente` em `entities/index.ts`**

Adicionar `export * from "./frente";` — arquivo fica:

```typescript
export * from "./anoLetivo";
export * from "./periodo";
export * from "./materia";
export * from "./frente";
export * from "./avaliacao";
export * from "./nota";
export * from "./prospecto";
export * from "./rascunho";
```

- [ ] **Step 4: Schema Drizzle**

Em `src/data/local/db/schema.ts`, adicionar a tabela `frente` logo após `materia` e antes de `avaliacao` (a tabela `avaliacao` referencia `frente`, então `frente` precisa estar declarada antes no arquivo):

```typescript
export const frente = sqliteTable("frente", {
  id: text("id").primaryKey(),
  materiaId: text("materia_id")
    .notNull()
    .references(() => materia.id),
  ordem: integer("ordem").notNull(),
  nome: text("nome").notNull(),
});
```

E em `avaliacao`, adicionar a coluna `frenteId` logo após `materiaId`:

```typescript
export const avaliacao = sqliteTable("avaliacao", {
  id: text("id").primaryKey(),
  materiaId: text("materia_id")
    .notNull()
    .references(() => materia.id),
  frenteId: text("frente_id")
    .notNull()
    .references(() => frente.id),
  periodoId: text("periodo_id")
    .notNull()
    .references(() => periodo.id),
  titulo: text("titulo").notNull(),
  tipoId: text("tipo_id").notNull(),
  peso: integer("peso").notNull(),
  notaMaximaMilis: integer("nota_maxima_milis").notNull(),
  data: text("data"),
  obrigatoria: integer("obrigatoria", { mode: "boolean" }).notNull().default(false),
});
```

- [ ] **Step 5: Gerar a migração**

Run: `npx drizzle-kit generate`
Expected: novo arquivo em `src/data/local/db/migrations/000X_*.sql` criando a tabela `frente` e adicionando a coluna `frente_id` em `avaliacao`. Conferir que o SQL gerado bate com o schema (ler o arquivo gerado).

- [ ] **Step 6: Repositório de domínio**

```typescript
// src/domain/repositories/frenteRepository.ts
import type { Frente } from "../entities/frente";

/**
 * CRUD mínimo — só o necessário para cadastrar 1-2 frentes por matéria e
 * listá-las. Não é um repositório completo (sem `atualizar`/`remover`
 * ainda) — ver docs/superpowers/specs/2026-08-14-formula-real-e-ui.md.
 */
export interface FrenteRepository {
  criar(frente: Frente): Promise<Frente>;
  listarPorMateria(materiaId: string): Promise<Frente[]>;
}
```

Adicionar `export * from "./frenteRepository";` em `src/domain/repositories/index.ts` (junto com os demais, ordem alfabética não é exigida, mas mantenha o padrão existente de um export por linha).

- [ ] **Step 7: Mapper**

```typescript
// src/data/mappers/frenteMapper.ts
import type { Frente } from "../../domain/entities/frente";
import type { frente } from "../local/db/schema";

type FrenteRow = typeof frente.$inferSelect;
type NovaFrenteRow = typeof frente.$inferInsert;

export function frenteRowParaDominio(row: FrenteRow): Frente {
  return {
    id: row.id,
    materiaId: row.materiaId,
    ordem: row.ordem,
    nome: row.nome,
  };
}

export function frenteDominioParaRow(entidade: Frente): NovaFrenteRow {
  return {
    id: entidade.id,
    materiaId: entidade.materiaId,
    ordem: entidade.ordem,
    nome: entidade.nome,
  };
}
```

Adicionar `export * from "./frenteMapper";` em `src/data/mappers/index.ts`.

Em `src/data/mappers/avaliacaoMapper.ts`, adicionar `frenteId` nas duas funções:

```typescript
export function avaliacaoRowParaDominio(row: AvaliacaoRow): Avaliacao {
  return {
    id: row.id,
    materiaId: row.materiaId,
    frenteId: row.frenteId,
    periodoId: row.periodoId,
    titulo: row.titulo,
    tipoId: row.tipoId,
    peso: row.peso,
    notaMaxima: new Decimal(row.notaMaximaMilis).div(ESCALA_MILIS),
    data: row.data,
    obrigatoria: row.obrigatoria,
  };
}

export function avaliacaoDominioParaRow(entidade: Avaliacao): NovaAvaliacaoRow {
  return {
    id: entidade.id,
    materiaId: entidade.materiaId,
    frenteId: entidade.frenteId,
    periodoId: entidade.periodoId,
    titulo: entidade.titulo,
    tipoId: entidade.tipoId,
    peso: entidade.peso,
    notaMaximaMilis: entidade.notaMaxima.mul(ESCALA_MILIS).toDecimalPlaces(0).toNumber(),
    data: entidade.data,
    obrigatoria: entidade.obrigatoria,
  };
}
```

(Nenhuma mudança necessária em `src/data/repositories/avaliacaoRepositoryDrizzle.ts` — todos os métodos já delegam para o mapper, então `frenteId` flui automaticamente.)

- [ ] **Step 8: Implementação Drizzle**

```typescript
// src/data/repositories/frenteRepositoryDrizzle.ts
import { eq } from "drizzle-orm";
import type { FrenteRepository } from "../../domain/repositories/frenteRepository";
import type { Frente } from "../../domain/entities/frente";
import type { AppDatabase } from "../local/db/client";
import { frente } from "../local/db/schema";
import { frenteDominioParaRow, frenteRowParaDominio } from "../mappers/frenteMapper";

export class FrenteRepositoryDrizzle implements FrenteRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Frente): Promise<Frente> {
    await this.db.insert(frente).values(frenteDominioParaRow(entidade));
    return entidade;
  }

  async listarPorMateria(materiaId: string): Promise<Frente[]> {
    const linhas = await this.db.select().from(frente).where(eq(frente.materiaId, materiaId));
    return linhas.map(frenteRowParaDominio);
  }
}
```

Adicionar `export * from "./frenteRepositoryDrizzle";` em `src/data/repositories/index.ts`.

- [ ] **Step 9: Escrever o teste**

```typescript
// src/data/repositories/frenteRepositoryDrizzle.test.ts
import { createTestDatabase } from "../local/db/testClient";
import type { AppDatabase } from "../local/db/client";
import { AnoLetivoRepositoryDrizzle } from "./anoLetivoRepositoryDrizzle";
import { MateriaRepositoryDrizzle } from "./materiaRepositoryDrizzle";
import { FrenteRepositoryDrizzle } from "./frenteRepositoryDrizzle";
import type { AnoLetivo } from "../../domain/entities/anoLetivo";
import type { Materia } from "../../domain/entities/materia";
import type { Frente } from "../../domain/entities/frente";

function novoAnoLetivo(): AnoLetivo {
  return {
    id: "ano-2026",
    rotulo: "2026",
    escola: null,
    serie: null,
    inicio: "2026-02-01",
    fim: "2026-12-15",
    formulaSpecId: "real-trimestral-v1",
    ativo: true,
  };
}

function novaMateria(): Materia {
  return {
    id: "materia-fisica",
    anoLetivoId: "ano-2026",
    nome: "Física",
    professor: null,
    cor: "#8B5FBF",
    cargaHoraria: null,
    formulaSpecIdOverride: null,
    arquivada: false,
  };
}

function novaFrente(overrides: Partial<Frente> = {}): Frente {
  return {
    id: "frente-1",
    materiaId: "materia-fisica",
    ordem: 1,
    nome: "Frente 1",
    ...overrides,
  };
}

describe("FrenteRepositoryDrizzle", () => {
  let db: AppDatabase;
  let frenteRepo: FrenteRepositoryDrizzle;

  beforeEach(async () => {
    db = createTestDatabase();
    await new AnoLetivoRepositoryDrizzle(db).criar(novoAnoLetivo());
    await new MateriaRepositoryDrizzle(db).criar(novaMateria());
    frenteRepo = new FrenteRepositoryDrizzle(db);
  });

  it("cria uma frente e lista por matéria", async () => {
    await frenteRepo.criar(novaFrente());
    const frentes = await frenteRepo.listarPorMateria("materia-fisica");
    expect(frentes).toEqual([novaFrente()]);
  });

  it("suporta duas frentes na mesma matéria, ordenáveis por 'ordem'", async () => {
    await frenteRepo.criar(novaFrente({ id: "frente-1", ordem: 1, nome: "Frente 1" }));
    await frenteRepo.criar(novaFrente({ id: "frente-2", ordem: 2, nome: "Frente 2" }));
    const frentes = await frenteRepo.listarPorMateria("materia-fisica");
    expect(frentes.map((f) => f.nome).sort()).toEqual(["Frente 1", "Frente 2"]);
  });
});
```

- [ ] **Step 10: Rodar os testes e confirmar que passam**

Run: `npx jest src/data/repositories/frenteRepositoryDrizzle.test.ts src/data`
Expected: PASS em tudo — inclusive os testes de `Avaliacao`/`Nota` já existentes (`avaliacaoNotaRepository.test.ts`), que agora exigem `frenteId` na entidade; se algum desses testes já construía uma `Avaliacao` sem `frenteId`, o TypeScript vai apontar o erro em `tsc` antes mesmo do Jest rodar — resolva adicionando um `frenteId` de teste a essas fixtures (mesmo padrão de string literal usado nos outros campos de id nesses testes).

- [ ] **Step 11: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/domain/entities src/domain/repositories src/data`
Expected: sem erros.

- [ ] **Step 12: Commit**

```bash
git add src/domain/entities src/domain/repositories src/data
git commit -m "feat: add Frente domain concept (entity, schema, repository)"
```

---

### Task 5: Dependência `react-native-svg`, tema de cores e `ProgressRing`

**Files:**
- Modify: `package.json` (via `expo install`)
- Create: `src/presentation/shared/theme.ts`
- Create: `src/presentation/shared/components/ProgressRing.tsx`

**Interfaces:**
- Produces: `cores` (paleta fixa), `paletaMateria`/`CorMateria` (mapeamento cor→tokens) em `theme.ts`; componente `<ProgressRing progresso={0..1} rotulo={string} />` consumido pela Task 8.

- [ ] **Step 1: Instalar a dependência**

Run: `npx expo install react-native-svg`

- [ ] **Step 2: Tema de cores**

```typescript
// src/presentation/shared/theme.ts
/** Paleta fixa do mockup Jujuba.dc.html. */
export const cores = {
  fundo: "#FFF7EF",
  fundoTopo: "#F2EBE3",
  rosa: "#E31C79",
  rosaEscuro: "#B8115F",
  rosaClaro: "#FDE3EE",
  dourado: "#C9974B",
  douradoClaro: "#F6E9D1",
  roxo: "#8B5FBF",
  roxoClaro: "#EDE3F3",
  texto: "#3A2418",
  textoSuave: "#8A7468",
  textoFraco: "#B7A79A",
  branco: "#FFFFFF",
  cartaoFundo: "#F7F1EA",
  bordaCartao: "#F1E7DC",
  sucesso: "#2E9E5B",
  sucessoFundo: "#E7F5EC",
  erro: "#E2574C",
  erroFundo: "#FBE7E5",
} as const;

export const paletaMateria = {
  pink: { fundo: cores.rosaClaro, cor: cores.rosa },
  gold: { fundo: cores.douradoClaro, cor: cores.dourado },
  plum: { fundo: cores.roxoClaro, cor: cores.roxo },
} as const;

export type CorMateria = keyof typeof paletaMateria;
```

- [ ] **Step 3: `ProgressRing`**

```tsx
// src/presentation/shared/components/ProgressRing.tsx
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cores } from "../theme";

interface ProgressRingProps {
  /** 0 a 1 — fração preenchida do anel. Valores fora do intervalo são recortados. */
  progresso: number;
  rotulo: string;
  tamanho?: number;
}

export function ProgressRing({ progresso, rotulo, tamanho = 64 }: ProgressRingProps) {
  const raio = tamanho / 2 - 3.5;
  const circunferencia = 2 * Math.PI * raio;
  const fracao = Math.max(0, Math.min(1, progresso));
  const preenchido = fracao * circunferencia;

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Svg width={tamanho} height={tamanho} style={estilos.svg}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={raio} stroke={cores.douradoClaro} strokeWidth={7} fill="none" />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cores.dourado}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
        />
      </Svg>
      <View style={estilos.rotuloContainer}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  svg: { transform: [{ rotate: "-90deg" }] },
  rotuloContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rotulo: { fontWeight: "700", fontSize: 15, color: cores.texto },
});
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/shared`
Expected: sem erros. (Sem teste dedicado — componente puramente visual, sem lógica; mesmo padrão já usado para `UpdateBanner` na passada anterior.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/presentation/shared
git commit -m "feat: add react-native-svg, color theme, and ProgressRing"
```

---

### Task 6: Redux slice da tela Início

**Files:**
- Create: `src/presentation/store/inicioSlice.ts`
- Modify: `src/presentation/store/store.ts`
- Create: `src/presentation/store/inicioSlice.test.ts`

**Interfaces:**
- Consumes: `CorMateria` de `../shared/theme` (Task 5).
- Produces: reducer `inicio`, actions `selecionarTermo`, `definirMeta`, `adicionarMateria(nome, cor, quantidadeFrentes)`, `removerMateria(id)`, `definirNotaComponente({materiaId, frenteId, componente, valor, simulado?})`, `limparSimulados()`; tipos `Materia`, `Frente`, `NotasFrente`, constante `TERMOS`. `CorMateria` **não** é re-exportado daqui — todo consumidor (Tasks 7, 9, 10, 11) importa `CorMateria` diretamente de `../shared/theme` (Task 5).

- [ ] **Step 1: Escrever os testes**

```typescript
// src/presentation/store/inicioSlice.test.ts
import inicioReducer, {
  adicionarMateria,
  definirMeta,
  definirNotaComponente,
  limparSimulados,
  removerMateria,
  selecionarTermo,
  TERMOS,
} from "./inicioSlice";

describe("inicioSlice", () => {
  const estadoInicial = inicioReducer(undefined, { type: "@@INIT" });

  it("começa no primeiro termo e meta 7", () => {
    expect(estadoInicial.termoSelecionado).toBe(TERMOS[0]);
    expect(estadoInicial.meta).toBe(7);
    expect(estadoInicial.materias).toEqual([]);
  });

  it("adicionarMateria com 1 frente cria uma frente 'Única'", () => {
    const proximo = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    expect(proximo.materias).toHaveLength(1);
    expect(proximo.materias[0].frentes).toHaveLength(1);
    expect(proximo.materias[0].frentes[0].nome).toBe("Única");
  });

  it("adicionarMateria com 2 frentes cria 'Frente 1' e 'Frente 2'", () => {
    const proximo = inicioReducer(estadoInicial, adicionarMateria("Física", "plum", 2));
    expect(proximo.materias[0].frentes.map((f) => f.nome)).toEqual(["Frente 1", "Frente 2"]);
  });

  it("removerMateria remove pelo id", () => {
    const comMateria = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const id = comMateria.materias[0].id;
    const semMateria = inicioReducer(comMateria, removerMateria(id));
    expect(semMateria.materias).toHaveLength(0);
  });

  it("definirMeta recorta para o intervalo [0, 10]", () => {
    expect(inicioReducer(estadoInicial, definirMeta(15)).meta).toBe(10);
    expect(inicioReducer(estadoInicial, definirMeta(-3)).meta).toBe(0);
    expect(inicioReducer(estadoInicial, definirMeta(6.5)).meta).toBe(6.5);
  });

  it("definirNotaComponente grava a nota no termo selecionado, sem afetar outros termos", () => {
    let estado = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const materiaId = estado.materias[0].id;
    const frenteId = estado.materias[0].frentes[0].id;

    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "at", valor: "8,5" })
    );
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].at).toBe("8,5");
    expect(estado.materias[0].frentes[0].notas[TERMOS[1]]).toBeUndefined();
  });

  it("definirNotaComponente com simulado=true marca a chave em `simulados`; limparSimulados apaga só o que foi simulado", () => {
    let estado = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const materiaId = estado.materias[0].id;
    const frenteId = estado.materias[0].frentes[0].id;

    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "at", valor: "digitado pelo usuário" })
    );
    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "ao", valor: "6,4", simulado: true })
    );
    expect(Object.keys(estado.simulados)).toHaveLength(1);

    estado = inicioReducer(estado, limparSimulados());
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].at).toBe("digitado pelo usuário");
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].ao).toBe("");
    expect(estado.simulados).toEqual({});
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx jest src/presentation/store/inicioSlice.test.ts`
Expected: FAIL — módulo não existe ainda.

- [ ] **Step 3: Implementar**

```typescript
// src/presentation/store/inicioSlice.ts
import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import type { CorMateria } from "../shared/theme";

export const TERMOS = ["1º Tri", "2º Tri", "3º Tri"];

export interface NotasFrente {
  at: string;
  ao: string;
  saep: string;
  tarefa: string;
}

export interface Frente {
  id: string;
  nome: string;
  /** `notas[termo]` — componentes digitados nesse termo (string, aceita vírgula; vazio = não digitado). */
  notas: Record<string, NotasFrente>;
}

export interface Materia {
  id: string;
  nome: string;
  cor: CorMateria;
  frentes: Frente[];
}

interface InicioState {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
  /** Chaves `"materiaId|termo|frenteId|componente"` simuladas nesta sessão — nunca persistidas. */
  simulados: Record<string, boolean>;
}

const notasVazias = (): NotasFrente => ({ at: "", ao: "", saep: "", tarefa: "" });

const initialState: InicioState = {
  termoSelecionado: TERMOS[0],
  meta: 7,
  materias: [],
  simulados: {},
};

function chaveSimulado(materiaId: string, termo: string, frenteId: string, componente: string): string {
  return `${materiaId}|${termo}|${frenteId}|${componente}`;
}

const inicioSlice = createSlice({
  name: "inicio",
  initialState,
  reducers: {
    selecionarTermo(state, action: PayloadAction<string>) {
      state.termoSelecionado = action.payload;
    },
    definirMeta(state, action: PayloadAction<number>) {
      state.meta = Math.max(0, Math.min(10, action.payload));
    },
    adicionarMateria: {
      reducer(
        state,
        action: PayloadAction<{ id: string; nome: string; cor: CorMateria; quantidadeFrentes: 1 | 2 }>
      ) {
        const { id, nome, cor, quantidadeFrentes } = action.payload;
        const frentes: Frente[] =
          quantidadeFrentes === 2
            ? [
                { id: `${id}-f1`, nome: "Frente 1", notas: {} },
                { id: `${id}-f2`, nome: "Frente 2", notas: {} },
              ]
            : [{ id: `${id}-unica`, nome: "Única", notas: {} }];
        state.materias.push({ id, nome, cor, frentes });
      },
      prepare(nome: string, cor: CorMateria, quantidadeFrentes: 1 | 2) {
        return { payload: { id: nanoid(), nome, cor, quantidadeFrentes } };
      },
    },
    removerMateria(state, action: PayloadAction<string>) {
      state.materias = state.materias.filter((materia) => materia.id !== action.payload);
    },
    definirNotaComponente(
      state,
      action: PayloadAction<{
        materiaId: string;
        frenteId: string;
        componente: keyof NotasFrente;
        valor: string;
        simulado?: boolean;
      }>
    ) {
      const { materiaId, frenteId, componente, valor, simulado } = action.payload;
      const materia = state.materias.find((m) => m.id === materiaId);
      const frente = materia?.frentes.find((f) => f.id === frenteId);
      if (!frente) return;

      const termo = state.termoSelecionado;
      const notasAtuais = frente.notas[termo] ?? notasVazias();
      frente.notas[termo] = { ...notasAtuais, [componente]: valor };

      const chave = chaveSimulado(materiaId, termo, frenteId, componente);
      if (simulado) {
        state.simulados[chave] = true;
      } else {
        delete state.simulados[chave];
      }
    },
    limparSimulados(state) {
      const termo = state.termoSelecionado;
      for (const materia of state.materias) {
        for (const frente of materia.frentes) {
          const notasAtuais = frente.notas[termo];
          if (!notasAtuais) continue;
          const limpas = { ...notasAtuais };
          (Object.keys(limpas) as (keyof NotasFrente)[]).forEach((componente) => {
            const chave = chaveSimulado(materia.id, termo, frente.id, componente);
            if (state.simulados[chave]) {
              limpas[componente] = "";
            }
          });
          frente.notas[termo] = limpas;
        }
      }
      state.simulados = {};
    },
  },
});

export const {
  selecionarTermo,
  definirMeta,
  adicionarMateria,
  removerMateria,
  definirNotaComponente,
  limparSimulados,
} = inicioSlice.actions;
export default inicioSlice.reducer;
```

Em `src/presentation/store/store.ts`, registrar o reducer:

```typescript
import { configureStore } from "@reduxjs/toolkit";
import specReducer from "./specSlice";
import updatesReducer from "./updatesSlice";
import inicioReducer from "./inicioSlice";

export const store = configureStore({
  reducer: {
    spec: specReducer,
    updates: updatesReducer,
    inicio: inicioReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx jest src/presentation/store/inicioSlice.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/store`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/store
git commit -m "feat: add inicioSlice (Redux state for the Início screen)"
```

---

### Task 7: Header com saudação, ícone e chips de trimestre

**Files:**
- Create: `src/presentation/features/inicio/HeaderInicio.tsx`

**Interfaces:**
- Consumes: `cores` (Task 5), `TERMOS` (Task 6).
- Produces: `<HeaderInicio termoSelecionado={string} onSelecionarTermo={(termo: string) => void} />`.

- [ ] **Step 1: Implementar**

Porta direta do cabeçalho do mockup (`Jujuba.dc.html`, div rosa com ícone + saudação + chips de trimestre roláveis):

```tsx
// src/presentation/features/inicio/HeaderInicio.tsx
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores } from "../../shared/theme";
import { TERMOS } from "../../store/inicioSlice";

const iconeJujuba = require("../../../../jujubaIcon.jpeg");

interface HeaderInicioProps {
  termoSelecionado: string;
  onSelecionarTermo: (termo: string) => void;
}

export function HeaderInicio({ termoSelecionado, onSelecionarTermo }: HeaderInicioProps) {
  return (
    <View style={estilos.container}>
      <View style={estilos.linhaSaudacao}>
        <Image source={iconeJujuba} style={estilos.icone} />
        <View>
          <Text style={estilos.saudacao}>Oi!</Text>
          <Text style={estilos.subtitulo}>Digite suas notas e veja a média na hora</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chips}>
        {TERMOS.map((termo) => {
          const selecionado = termo === termoSelecionado;
          return (
            <TouchableOpacity
              key={termo}
              onPress={() => onSelecionarTermo(termo)}
              style={[estilos.chip, { backgroundColor: selecionado ? cores.branco : "rgba(255,255,255,0.18)" }]}
            >
              <Text style={[estilos.chipTexto, { color: selecionado ? cores.rosa : cores.branco }]}>{termo}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { backgroundColor: cores.rosa, paddingTop: 32, paddingHorizontal: 20, paddingBottom: 44 },
  linhaSaudacao: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 52, height: 52, borderRadius: 26 },
  saudacao: { fontWeight: "700", fontSize: 20, color: cores.branco },
  subtitulo: { fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: "600", marginTop: 2 },
  chips: { marginTop: 18 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginRight: 8 },
  chipTexto: { fontSize: 12.5, fontWeight: "700" },
});
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/features`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/features/inicio/HeaderInicio.tsx
git commit -m "feat: add HeaderInicio (greeting, icon, term chips)"
```

---

### Task 8: Cartão de meta (anel de progresso, stepper, simular)

**Files:**
- Create: `src/presentation/features/inicio/CartaoMeta.tsx`

**Interfaces:**
- Consumes: `ProgressRing` (Task 5), `cores` (Task 5).
- Produces: `<CartaoMeta mediaGeral={Decimal} termoSelecionado={string} quantidadeMaterias={number} meta={number} onMetaMenos={() => void} onMetaMais={() => void} onSimularTudo={() => void} onLimparSimulados={() => void} temSimulados={boolean} />`.

- [ ] **Step 1: Implementar**

```tsx
// src/presentation/features/inicio/CartaoMeta.tsx
import Decimal from "decimal.js";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ProgressRing } from "../../shared/components/ProgressRing";
import { cores } from "../../shared/theme";

interface CartaoMetaProps {
  mediaGeral: Decimal;
  termoSelecionado: string;
  quantidadeMaterias: number;
  meta: number;
  onMetaMenos: () => void;
  onMetaMais: () => void;
  onSimularTudo: () => void;
  onLimparSimulados: () => void;
  temSimulados: boolean;
}

function formatarUmaCasa(valor: Decimal | number): string {
  const numero = valor instanceof Decimal ? valor.toNumber() : valor;
  return numero.toFixed(1).replace(".", ",");
}

export function CartaoMeta({
  mediaGeral,
  termoSelecionado,
  quantidadeMaterias,
  meta,
  onMetaMenos,
  onMetaMais,
  onSimularTudo,
  onLimparSimulados,
  temSimulados,
}: CartaoMetaProps) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.linhaResumo}>
        <ProgressRing progresso={mediaGeral.toNumber() / 10} rotulo={formatarUmaCasa(mediaGeral)} />
        <View style={estilos.resumoTexto}>
          <Text style={estilos.rotuloResumo}>Média geral · {termoSelecionado}</Text>
          <Text style={estilos.valorResumo}>
            {quantidadeMaterias} {quantidadeMaterias === 1 ? "matéria" : "matérias"}
          </Text>
          <Text style={estilos.formula}>(AT×2 + Obj + SAEP) ÷ 4 + tarefa</Text>
        </View>
      </View>

      <View style={estilos.linhaMeta}>
        <View>
          <Text style={estilos.rotuloMeta}>Meta de média</Text>
          <Text style={estilos.subtituloMeta}>Usada na simulação</Text>
        </View>
        <View style={estilos.stepper}>
          <TouchableOpacity onPress={onMetaMenos} style={estilos.botaoStepper}>
            <Text style={estilos.textoStepper}>−</Text>
          </TouchableOpacity>
          <Text style={estilos.valorMeta}>{formatarUmaCasa(meta)}</Text>
          <TouchableOpacity onPress={onMetaMais} style={estilos.botaoStepper}>
            <Text style={estilos.textoStepper}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.linhaAcoes}>
        <TouchableOpacity onPress={onSimularTudo} style={estilos.botaoSimular}>
          <Text style={estilos.textoBotaoSimular}>Simular mínimo p/ {formatarUmaCasa(meta)}</Text>
        </TouchableOpacity>
        {temSimulados && (
          <TouchableOpacity onPress={onLimparSimulados} style={estilos.botaoLimpar}>
            <Text style={estilos.textoBotaoLimpar}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    marginTop: -30,
    marginHorizontal: 20,
    backgroundColor: cores.branco,
    borderRadius: 22,
    padding: 18,
    shadowColor: cores.rosaEscuro,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  linhaResumo: { flexDirection: "row", alignItems: "center", gap: 16 },
  resumoTexto: { flex: 1 },
  rotuloResumo: { fontSize: 12.5, color: cores.textoSuave, fontWeight: "700" },
  valorResumo: { fontWeight: "700", fontSize: 15, color: cores.texto, marginTop: 2 },
  formula: { fontSize: 11.5, color: cores.textoFraco, fontWeight: "600", marginTop: 4 },
  linhaMeta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rotuloMeta: { fontSize: 12, fontWeight: "700", color: cores.textoSuave },
  subtituloMeta: { fontSize: 11.5, fontWeight: "600", color: cores.textoFraco, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  botaoStepper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.douradoClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  textoStepper: { color: cores.dourado, fontWeight: "800", fontSize: 18 },
  valorMeta: { fontWeight: "800", fontSize: 20, color: cores.texto, minWidth: 44, textAlign: "center" },
  linhaAcoes: { flexDirection: "row", gap: 8, marginTop: 14 },
  botaoSimular: {
    flex: 1,
    alignItems: "center",
    backgroundColor: cores.rosa,
    padding: 13,
    borderRadius: 14,
  },
  textoBotaoSimular: { color: cores.branco, fontWeight: "700", fontSize: 13.5 },
  botaoLimpar: { alignItems: "center", backgroundColor: cores.cartaoFundo, padding: 13, paddingHorizontal: 15, borderRadius: 14 },
  textoBotaoLimpar: { color: cores.textoSuave, fontWeight: "700", fontSize: 13.5 },
});
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/features`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/features/inicio/CartaoMeta.tsx
git commit -m "feat: add CartaoMeta (progress ring, goal stepper, simulate actions)"
```

---

### Task 9: Cartão de matéria (campos de nota por frente)

**Files:**
- Create: `src/presentation/features/inicio/CartaoMateria.tsx`

**Interfaces:**
- Consumes: `Materia`, `NotasFrente` (Task 6), `avaliarPeriodo` (Task 2), `resolverMinimosComponentes` (Task 3), `cores`/`paletaMateria` (Task 5).
- Produces: `<CartaoMateria spec={FormulaSpec} materia={Materia} termoSelecionado={string} meta={number} onDefinirNota={(frenteId, componente, valor) => void} onSimularMateria={() => void} onRemover={() => void} />`.

- [ ] **Step 1: Implementar**

```tsx
// src/presentation/features/inicio/CartaoMateria.tsx
import Decimal from "decimal.js";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { avaliarPeriodo, mediaEntreFrentes } from "../../../domain/formula/motorDeCalculo";
import { FormulaSpec } from "../../../domain/formula/types";
import { Materia, NotasFrente } from "../../store/inicioSlice";
import { cores, paletaMateria } from "../../shared/theme";

interface CartaoMateriaProps {
  spec: FormulaSpec;
  materia: Materia;
  termoSelecionado: string;
  meta: number;
  onDefinirNota: (frenteId: string, componente: keyof NotasFrente, valor: string) => void;
  onSimularMateria: () => void;
  onRemover: () => void;
}

const ROTULOS_COMPONENTE: Record<keyof NotasFrente, string> = {
  at: "AT",
  ao: "Obj",
  saep: "SAEP",
  tarefa: "Tarefa",
};

function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

function formatarUmaCasa(valor: Decimal): string {
  return valor.toNumber().toFixed(1).replace(".", ",");
}

export function CartaoMateria({
  spec,
  materia,
  termoSelecionado,
  meta,
  onDefinirNota,
  onSimularMateria,
  onRemover,
}: CartaoMateriaProps) {
  const cor = paletaMateria[materia.cor];

  const mediasFrentes = materia.frentes.map((frente) => {
    const notas = frente.notas[termoSelecionado];
    return avaliarPeriodo(spec, {
      at: paraDecimal(notas?.at ?? ""),
      ao: paraDecimal(notas?.ao ?? ""),
      saep: paraDecimal(notas?.saep ?? ""),
      tarefa: paraDecimal(notas?.tarefa ?? ""),
    });
  });
  const mediaMateria = mediaEntreFrentes(mediasFrentes);
  const alcancouMeta = mediaMateria.gte(new Decimal(meta));

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalho}>
        <View style={estilos.cabecalhoEsquerda}>
          <View style={[estilos.marcador, { backgroundColor: cor.cor }]} />
          <Text style={estilos.nome}>{materia.nome}</Text>
          {materia.frentes.length > 1 && (
            <View style={estilos.selo2Frentes}>
              <Text style={estilos.textoSelo2Frentes}>2 frentes</Text>
            </View>
          )}
        </View>
        <View style={estilos.cabecalhoDireita}>
          <View style={[estilos.badge, { backgroundColor: alcancouMeta ? cores.sucessoFundo : cores.erroFundo }]}>
            <Text style={[estilos.textoBadge, { color: alcancouMeta ? cores.sucesso : cores.erro }]}>
              {formatarUmaCasa(mediaMateria)}
            </Text>
          </View>
          <TouchableOpacity onPress={onRemover} style={estilos.botaoRemover}>
            <Text style={estilos.textoRemover}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {materia.frentes.map((frente, indice) => {
        const notas = frente.notas[termoSelecionado];
        const mediaFrente = mediasFrentes[indice];
        return (
          <View key={frente.id} style={estilos.blocoFrente}>
            {materia.frentes.length > 1 && (
              <View style={estilos.linhaRotuloFrente}>
                <Text style={estilos.rotuloFrente}>{frente.nome}</Text>
                <Text style={estilos.mediaFrente}>média {formatarUmaCasa(mediaFrente)}</Text>
              </View>
            )}
            <View style={estilos.linhaCampos}>
              {(Object.keys(ROTULOS_COMPONENTE) as (keyof NotasFrente)[]).map((componente) => (
                <View key={componente} style={estilos.campo}>
                  <Text style={estilos.rotuloCampo}>{ROTULOS_COMPONENTE[componente]}</Text>
                  <TextInput
                    value={notas?.[componente] ?? ""}
                    onChangeText={(valor) => onDefinirNota(frente.id, componente, valor)}
                    placeholder="0,0"
                    inputMode="decimal"
                    style={estilos.entrada}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <View style={estilos.rodape}>
        <Text style={estilos.dica}>
          {alcancouMeta ? "Meta alcançada." : "Faltam notas ou a média está abaixo da meta."}
        </Text>
        <TouchableOpacity onPress={onSimularMateria} style={estilos.botaoMinimo}>
          <Text style={estilos.textoBotaoMinimo}>Mínimo p/ {formatarUmaCasa(new Decimal(meta))}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.branco, borderRadius: 20, padding: 15, marginBottom: 12 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cabecalhoEsquerda: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1 },
  marcador: { width: 10, height: 10, borderRadius: 5 },
  nome: { fontWeight: "700", fontSize: 15, color: cores.texto },
  selo2Frentes: { backgroundColor: cores.roxoClaro, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  textoSelo2Frentes: { fontSize: 10.5, fontWeight: "800", color: cores.roxo },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999 },
  textoBadge: { fontWeight: "800", fontSize: 13 },
  botaoRemover: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cores.cartaoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  textoRemover: { color: cores.textoFraco, fontSize: 14, fontWeight: "700" },
  blocoFrente: { marginTop: 13 },
  linhaRotuloFrente: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  rotuloFrente: { fontSize: 11.5, fontWeight: "800", color: cores.roxo },
  mediaFrente: { fontSize: 11.5, fontWeight: "700", color: cores.textoFraco },
  linhaCampos: { flexDirection: "row", gap: 8 },
  campo: { flex: 1, gap: 4 },
  rotuloCampo: { fontSize: 10.5, fontWeight: "800", color: cores.textoSuave, textAlign: "center" },
  entrada: {
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: cores.bordaCartao,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
  },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13 },
  dica: { flex: 1, fontSize: 11.5, fontWeight: "700", color: cores.textoFraco },
  botaoMinimo: { backgroundColor: cores.rosaClaro, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12 },
  textoBotaoMinimo: { color: cores.rosa, fontSize: 12, fontWeight: "800" },
});
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/features`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/features/inicio/CartaoMateria.tsx
git commit -m "feat: add CartaoMateria (per-subject score cards with frentes)"
```

---

### Task 10: Bottom sheet "Adicionar matéria"

**Files:**
- Create: `src/presentation/features/inicio/AdicionarMateriaSheet.tsx`

**Interfaces:**
- Consumes: `CorMateria` (Task 5), `react-hook-form` + `zod` (já instalados).
- Produces: `<AdicionarMateriaSheet visivel={boolean} onFechar={() => void} onAdicionar={(nome, cor, quantidadeFrentes) => void} />`.

- [ ] **Step 1: Implementar**

```tsx
// src/presentation/features/inicio/AdicionarMateriaSheet.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { cores, CorMateria } from "../../shared/theme";

const esquemaNovaMateria = z.object({
  nome: z.string().trim().min(1, "Digite o nome da matéria"),
});

const CORES_DISPONIVEIS: CorMateria[] = ["pink", "gold", "plum"];

interface AdicionarMateriaSheetProps {
  visivel: boolean;
  onFechar: () => void;
  onAdicionar: (nome: string, cor: CorMateria, quantidadeFrentes: 1 | 2) => void;
}

export function AdicionarMateriaSheet({ visivel, onFechar, onAdicionar }: AdicionarMateriaSheetProps) {
  const [quantidadeFrentes, setQuantidadeFrentes] = useState<1 | 2>(1);
  const [corSelecionada, setCorSelecionada] = useState<CorMateria>("pink");
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaNovaMateria), defaultValues: { nome: "" } });

  function fechar() {
    reset();
    setQuantidadeFrentes(1);
    setCorSelecionada("pink");
    onFechar();
  }

  function enviar(dados: { nome: string }) {
    onAdicionar(dados.nome, corSelecionada, quantidadeFrentes);
    fechar();
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <TouchableOpacity style={estilos.fundo} activeOpacity={1} onPress={fechar} />
      <View style={estilos.folha}>
        <View style={estilos.puxador} />
        <View style={estilos.cabecalho}>
          <Text style={estilos.titulo}>Nova matéria</Text>
          <TouchableOpacity onPress={fechar} style={estilos.botaoFechar}>
            <Text style={estilos.textoBotaoFechar}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={estilos.rotulo}>Nome da matéria</Text>
        <Controller
          control={control}
          name="nome"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Ex.: Biologia"
              style={estilos.entrada}
            />
          )}
        />
        {errors.nome && <Text style={estilos.erro}>{errors.nome.message}</Text>}

        <Text style={estilos.rotulo}>Frentes</Text>
        <View style={estilos.linhaChips}>
          {([1, 2] as const).map((quantidade) => {
            const selecionado = quantidade === quantidadeFrentes;
            return (
              <TouchableOpacity
                key={quantidade}
                onPress={() => setQuantidadeFrentes(quantidade)}
                style={[
                  estilos.chip,
                  { backgroundColor: selecionado ? cores.rosa : cores.cartaoFundo },
                ]}
              >
                <Text style={[estilos.textoChip, { color: selecionado ? cores.branco : cores.textoSuave }]}>
                  {quantidade === 1 ? "Frente única" : "Duas frentes"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={estilos.rotulo}>Cor</Text>
        <View style={estilos.linhaCores}>
          {CORES_DISPONIVEIS.map((cor) => (
            <TouchableOpacity
              key={cor}
              onPress={() => setCorSelecionada(cor)}
              style={[
                estilos.bolinhaCor,
                {
                  backgroundColor: cores[corParaTom(cor)],
                  borderColor: cor === corSelecionada ? cores.texto : "transparent",
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleSubmit(enviar)} style={estilos.botaoAdicionar}>
          <Text style={estilos.textoBotaoAdicionar}>Adicionar matéria</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function corParaTom(cor: CorMateria): "rosa" | "dourado" | "roxo" {
  return cor === "pink" ? "rosa" : cor === "gold" ? "dourado" : "roxo";
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(58,36,24,0.45)" },
  folha: { backgroundColor: cores.branco, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingTop: 14 },
  puxador: { width: 36, height: 4, backgroundColor: cores.bordaCartao, borderRadius: 99, alignSelf: "center", marginBottom: 14 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titulo: { fontWeight: "700", fontSize: 18, color: cores.texto },
  botaoFechar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.cartaoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoFechar: { fontSize: 16, color: cores.textoSuave },
  rotulo: { fontSize: 12.5, fontWeight: "700", color: cores.textoSuave, marginTop: 18, marginBottom: 8 },
  entrada: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: cores.bordaCartao,
    paddingHorizontal: 16,
    fontSize: 15.5,
    fontWeight: "700",
    color: cores.texto,
  },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  linhaChips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14 },
  textoChip: { fontSize: 13, fontWeight: "700" },
  linhaCores: { flexDirection: "row", gap: 10 },
  bolinhaCor: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  botaoAdicionar: { marginTop: 22, backgroundColor: cores.rosa, padding: 15, borderRadius: 16, alignItems: "center" },
  textoBotaoAdicionar: { color: cores.branco, fontWeight: "700", fontSize: 15.5 },
});
```

**Atenção para quem implementar:** o exemplo acima usa `Controller` mas não o importa — adicionar `Controller` ao import de `"react-hook-form"` junto com `useForm` (`import { Controller, useForm } from "react-hook-form";`). Isso é intencional deixar para o passo de implementação notar via `tsc` (o erro "Cannot find name 'Controller'" é esperado no Step 2 abaixo e faz parte de verificar que os testes/tipagem realmente pegam esse tipo de problema) — corrija antes de prosseguir para o Step 3.

- [ ] **Step 2: Rodar a verificação de tipos (esperado falhar por causa do import faltando)**

Run: `npx tsc --noEmit`
Expected: FAIL — `Cannot find name 'Controller'` em `AdicionarMateriaSheet.tsx`.

- [ ] **Step 3: Corrigir o import e verificar novamente**

Adicionar `Controller` ao import de `react-hook-form` (linha 1 do arquivo vira `import { Controller, useForm } from "react-hook-form";`).

Run: `npx tsc --noEmit && npx eslint src/presentation/features`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/features/inicio/AdicionarMateriaSheet.tsx
git commit -m "feat: add AdicionarMateriaSheet (add-subject bottom sheet)"
```

---

### Task 11: Compor a tela Início (`app/index.tsx`)

**Files:**
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 1-10 — `HeaderInicio`, `CartaoMeta`, `CartaoMateria`, `AdicionarMateriaSheet`, `inicioSlice` actions/state, `avaliarPeriodo`/`mediaEntreFrentes`, `resolverMinimosComponentes`, a nova `FormulaSpec` real.
- Substitui o `app/index.tsx` atual (que só mostra "Jujuba" + selo de fórmula provisória, carregando `specs/exemplo-media-bimestral.json`) — passa a carregar `specs/formula-real-trimestral.json` como spec ativa.

- [ ] **Step 1: Implementar**

```tsx
// app/index.tsx
import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import specReal from "../specs/formula-real-trimestral.json";
import { avaliarPeriodo, mediaEntreFrentes } from "../src/domain/formula/motorDeCalculo";
import { resolverMinimosComponentes } from "../src/domain/formula/componentGoalSolver";
import { FormulaSpec } from "../src/domain/formula/types";
import { especificarFormulaAtiva } from "../src/presentation/store/specSlice";
import {
  adicionarMateria,
  definirMeta,
  definirNotaComponente,
  limparSimulados,
  Materia,
  NotasFrente,
  removerMateria,
  selecionarTermo,
} from "../src/presentation/store/inicioSlice";
import { useAppDispatch, useAppSelector } from "../src/presentation/store/hooks";
import { HeaderInicio } from "../src/presentation/features/inicio/HeaderInicio";
import { CartaoMeta } from "../src/presentation/features/inicio/CartaoMeta";
import { CartaoMateria } from "../src/presentation/features/inicio/CartaoMateria";
import { AdicionarMateriaSheet } from "../src/presentation/features/inicio/AdicionarMateriaSheet";
import { CorMateria, cores } from "../src/presentation/shared/theme";

const spec = specReal as FormulaSpec;

function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

function mediaDaMateria(materia: Materia, termo: string): Decimal {
  const medias = materia.frentes.map((frente) => {
    const notas = frente.notas[termo];
    return avaliarPeriodo(spec, {
      at: paraDecimal(notas?.at ?? ""),
      ao: paraDecimal(notas?.ao ?? ""),
      saep: paraDecimal(notas?.saep ?? ""),
      tarefa: paraDecimal(notas?.tarefa ?? ""),
    });
  });
  return mediaEntreFrentes(medias);
}

export default function Inicio() {
  const dispatch = useAppDispatch();
  const { termoSelecionado, meta, materias, simulados } = useAppSelector((state) => state.inicio);
  const [sheetAberto, setSheetAberto] = useState(false);

  useEffect(() => {
    dispatch(especificarFormulaAtiva(spec));
  }, [dispatch]);

  const mediaGeral = materias.length
    ? mediaEntreFrentes(materias.map((materia) => mediaDaMateria(materia, termoSelecionado)))
    : new Decimal(0);

  function simularFrente(materia: Materia, frenteId: string) {
    const frente = materia.frentes.find((f) => f.id === frenteId);
    if (!frente) return;
    const notas = frente.notas[termoSelecionado];
    const preenchidos: Record<string, Decimal | null> = {
      at: notas?.at ? paraDecimal(notas.at) : null,
      ao: notas?.ao ? paraDecimal(notas.ao) : null,
      saep: notas?.saep ? paraDecimal(notas.saep) : null,
      tarefa: notas?.tarefa ? paraDecimal(notas.tarefa) : null,
    };
    const resultado = resolverMinimosComponentes(spec, preenchidos, new Decimal(meta));
    if (resultado.tipo !== "valores" && resultado.tipo !== "jaAlcancado") return;
    Object.entries(resultado.valores).forEach(([componente, valor]) => {
      dispatch(
        definirNotaComponente({
          materiaId: materia.id,
          frenteId,
          componente: componente as keyof NotasFrente,
          valor: valor.toNumber().toFixed(1).replace(".", ","),
          simulado: true,
        })
      );
    });
  }

  function simularMateria(materia: Materia) {
    materia.frentes.forEach((frente) => simularFrente(materia, frente.id));
  }

  return (
    <SafeAreaView style={estilos.container} edges={["bottom"]}>
      <FlatList
        data={materias}
        keyExtractor={(materia) => materia.id}
        ListHeaderComponent={
          <>
            <HeaderInicio termoSelecionado={termoSelecionado} onSelecionarTermo={(t) => dispatch(selecionarTermo(t))} />
            <CartaoMeta
              mediaGeral={mediaGeral}
              termoSelecionado={termoSelecionado}
              quantidadeMaterias={materias.length}
              meta={meta}
              onMetaMenos={() => dispatch(definirMeta(meta - 0.5))}
              onMetaMais={() => dispatch(definirMeta(meta + 0.5))}
              onSimularTudo={() => materias.forEach(simularMateria)}
              onLimparSimulados={() => dispatch(limparSimulados())}
              temSimulados={Object.keys(simulados).length > 0}
            />
            <View style={estilos.listaTitulo}>
              <Text style={estilos.tituloSecao}>Suas matérias</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={estilos.itemLista}>
            <CartaoMateria
              spec={spec}
              materia={item}
              termoSelecionado={termoSelecionado}
              meta={meta}
              onDefinirNota={(frenteId, componente, valor) =>
                dispatch(definirNotaComponente({ materiaId: item.id, frenteId, componente, valor }))
              }
              onSimularMateria={() => simularMateria(item)}
              onRemover={() => dispatch(removerMateria(item.id))}
            />
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity onPress={() => setSheetAberto(true)} style={estilos.botaoAdicionar}>
            <Text style={estilos.textoBotaoAdicionar}>+ Adicionar matéria</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={estilos.conteudo}
      />

      <AdicionarMateriaSheet
        visivel={sheetAberto}
        onFechar={() => setSheetAberto(false)}
        onAdicionar={(nome, cor: CorMateria, quantidadeFrentes) =>
          dispatch(adicionarMateria(nome, cor, quantidadeFrentes))
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: 20, paddingBottom: 32 },
  listaTitulo: { marginTop: 22, marginBottom: 10 },
  tituloSecao: { fontWeight: "700", fontSize: 15, color: cores.texto },
  itemLista: { marginBottom: 0 },
  botaoAdicionar: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: cores.rosaClaro,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 15,
    alignItems: "center",
  },
  textoBotaoAdicionar: { fontSize: 13.5, fontWeight: "700", color: cores.rosa },
});
```

**Atenção para quem implementar:** este arquivo substitui o `app/index.tsx` atual inteiro — não é um merge/patch, é uma reescrita completa. O selo "regra provisória" do arquivo anterior não se aplica mais (a spec real tem `provisoria: false`), então não precisa ser portado.

- [ ] **Step 2: Rodar a suíte inteira e confirmar que passa**

Run: `npx tsc --noEmit && npx eslint . && npx jest`
Expected: tudo passando — inclusive os testes das Tasks 1-6, que não devem ter sido afetados por esta mudança de UI.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: rebuild Início screen to match Jujuba.dc.html mockup"
```

---

## Nota para o executor: revisão final

Depois da Task 11, antes da revisão final de branch inteira, confira especificamente:
- Se `jujubaIcon.jpeg` (referenciado em `HeaderInicio.tsx` via `require`) realmente existe na raiz do repositório (deveria, já está lá desde o início do projeto).
- Se o teste de `avaliacaoNotaRepository.test.ts` (Task 4, Step 10) precisou de ajuste para incluir `frenteId` — se sim, confirmar que o ajuste não mudou o comportamento testado, só adicionou o campo obrigatório novo.
- Se `react-hook-form`'s `Controller` realmente precisa do import faltando corrigido manualmente (Task 10) — isso foi deixado de propósito como um "erro esperado" pedagógico no plano; confirmar que o implementador realmente rodou o Step 2 e viu o erro antes de corrigir no Step 3, não que pulou direto para a versão corrigida.

# Motor de Fórmula

O requisito "a fórmula será fornecida depois" é a decisão arquitetural mais importante
deste app. Ela determina que **o cálculo de notas não pode ser código** — precisa ser
*dado interpretado por um motor genérico*.

## 1. Por que declarativo

| Se a fórmula for código | Se a fórmula for dado |
|---|---|
| Cada mudança de regra = novo release + review da App Store (dias) | Mudança = novo JSON, aplicável na hora |
| Regra de outra escola = fork ou `if` gigante | Nova `FormulaSpec`, zero código |
| Impossível explicar ao usuário como a nota foi calculada | A spec *é* a explicação, renderizável na UI |
| Recalcular histórico com a regra antiga é inviável | `FormulaSpec` versionada → resultado reprodutível |

## 2. Anatomia da `FormulaSpec`

```jsonc
{
  "schemaVersion": 1,          // versão da LINGUAGEM
  "id": "colegio-x-2026",
  "versao": 3,                 // versão DESTA spec (imutável por versão)
  "nome": "Regime bimestral com recuperação",

  "periodos": { "tipo": "bimestre", "quantidade": 4 },

  "escala": {
    "min": 0, "max": 10,
    "casasDecimais": 1,
    "arredondamento": "half_up"   // half_up | half_even | floor | ceil
  },

  "componentes": [                 // tipos de avaliação de um período
    { "id": "prova",        "rotulo": "Prova",        "peso": 6, "obrigatorio": true },
    { "id": "trabalho",     "rotulo": "Trabalho",     "peso": 3 },
    { "id": "participacao", "rotulo": "Participação", "peso": 1 }
  ],

  "calculos": {
    "mediaPeriodo": "somaPonderada(componentes) / somaPesos(componentes)",
    "mediaAnual":   "media(periodos)",
    "mediaFinal":   "se(recuperacao == null, mediaAnual, (mediaAnual + recuperacao) / 2)"
  },

  "criterios": {
    "aprovado":    "mediaFinal >= 6 && frequencia >= 0.75",
    "recuperacao": "mediaAnual >= 3 && mediaAnual < 6",
    "reprovado":   "mediaAnual < 3 || frequencia < 0.75"
  },

  "meta": { "notaParaAprovacao": 6.0, "frequenciaMinima": 0.75 }
}
```

O schema formal está em [`../specs/formula.schema.json`](../specs/formula.schema.json)
e é validado **na importação**, não em runtime de cálculo.

## 3. Pipeline

```
FormulaSpec JSON
      │
      ▼
[1] Validação de schema (JSON Schema)  ──── falha ──▶ rejeita a spec inteira
      │
      ▼
[2] Parse das expressões → AST         (pacote `jsep`)
      │
      ▼
[3] Validação semântica                ──── falha ──▶ rejeita
      • toda variável referenciada existe no contexto
      • toda função está na WHITELIST
      • sem recursão entre cálculos (grafo acíclico)
      │
      ▼
[4] Compilação → Map<String, Expression> em cache (por hash da spec)
      │
      ▼
[5] MotorDeCalculo.avaliar(ContextoDeCalculo) → ResultadoCalculado
```

Passos 1–4 rodam **uma vez** por spec e ficam em cache. O passo 5 é O(nós da AST) e
roda a cada mudança de nota — barato o suficiente para atualizar a UI em tempo real.

### Whitelist de funções

`min` `max` `abs` `round` `floor` `ceil` `media` `soma` `somaPonderada` `somaPesos`
`contar` `maiorN` `menorN` `descartarMenor` `se` `nulo`

Nada fora dessa lista é aceito. Não existe `eval`, não existe acesso a I/O, não existe
laço. Uma spec maliciosa ou malformada no máximo é **rejeitada** — nunca executa código.

### Contexto de cálculo

```ts
interface ContextoDeCalculo {
  componentes: Record<string, Decimal | null>;   // prova: 8.5, trabalho: 7.0
  periodos: Record<string, Decimal | null>;      // P1: 7.9, P2: 8.2, ...
  recuperacao: Decimal | null;
  frequencia: Decimal;                            // 0.0 – 1.0
  pesos: Record<string, Decimal>;
  escala: Escala;
}
```

(`Decimal` aqui é o tipo de `decimal.js`, nunca `number` nativo — ver ADR 0004.)

## 4. `GoalSolver` — "quanto preciso tirar?"

Essa é a pergunta que o aluno realmente faz. A resposta **não** vem de inverter a
fórmula algebricamente: fórmulas escolares reais têm `se()`, `max()`, recuperação e
descarte de menor nota, e nenhuma delas tem inversa fechada.

Solução: **bisseção numérica sobre a variável-alvo**.

```
Entrada: variável-alvo v (ex.: nota da prova do 4º bimestre)
         alvo (ex.: situacao == "aprovado")
         domínio [escala.min, escala.max]

1. f(x) = avaliar(contexto com v := x).mediaFinal
2. Se f(max) < notaParaAprovacao  → "impossível atingir" (e informa o melhor caso)
3. Se f(min) >= notaParaAprovacao → "já garantido, qualquer nota serve"
4. Senão, bisseção até |hi - lo| < 10^-(casasDecimais+1)
5. Arredondar PARA CIMA na precisão da escala  (nunca dizer 6,49 quando precisa 6,5)
```

Pré-condição verificada em teste: `f` é **monotônica não-decrescente** em `v`. O motor
checa isso amostrando o domínio; se não for monotônica, devolve
`ResultadoIndeterminado` em vez de um número errado.

Três respostas possíveis, todas exibidas explicitamente na UI:

- ✅ **Já passou** — nenhuma nota futura muda a situação.
- 🎯 **Precisa de X,X** na avaliação Y.
- ❌ **Não é mais possível** atingir a aprovação por média (máximo alcançável: X,X).

## 5. Ciclo de vida e migração de specs

```
Spec v1 ──(escola muda a regra)──▶ Spec v2   (v1 permanece no banco, imutável)
   │                                  │
   └─ ResultadoCalculado do 1º bim ───┘─ ResultadoCalculado do 3º bim
      guarda formulaSpecId + versao=1     guarda versao=2
```

Ao ativar uma nova versão, o app pergunta: **recalcular o histórico** com a nova regra
ou **manter** os resultados antigos? Ambos os caminhos são suportados porque toda spec
antiga continua carregável.

## 6. A fórmula real

O app roda com `specs/formula-real-trimestral.json` — (AT×2 + Obj + SAEP) ÷ 4 + tarefa,
3 trimestres, aprovação com meta configurável pelo aluno na tela Início. A migração da
spec provisória (`specs/exemplo-media-bimestral.json`, usada durante o desenvolvimento
inicial) para a real não tocou uma linha de código do motor — só a troca do arquivo de
spec ativo, confirmando a premissa do [ADR 0003](adr/0003-formula-como-dado.md).

## 7. Testes-golden

Cada `FormulaSpec` vem acompanhada de um arquivo `<spec>.golden.json`:

```json
[
  { "nome": "aprovado direto",
    "entrada": { "P1": 8.0, "P2": 7.5, "P3": 9.0, "P4": 6.5, "frequencia": 0.92 },
    "esperado": { "mediaAnual": 7.8, "situacao": "aprovado" } },
  { "nome": "reprovado por falta",
    "entrada": { "P1": 9.0, "P2": 9.0, "P3": 9.0, "P4": 9.0, "frequencia": 0.60 },
    "esperado": { "situacao": "reprovado" } }
]
```

O CI roda todos os goldens de todas as specs a cada PR. Quando a fórmula definitiva
chegar, o trabalho é: escrever o JSON da spec + escrever os goldens a partir de casos
reais do boletim. Nenhum código novo.

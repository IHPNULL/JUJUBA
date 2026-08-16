# ADR 0003 — A fórmula de cálculo é dado, não código

- **Status:** Aceito
- **Data:** 2026-08-13

## Contexto
A fórmula de notas será fornecida depois do início do desenvolvimento, e é razoável
supor que mude (troca de escola, mudança de regra no meio do ano, série diferente).

## Decisão
A fórmula é uma **`FormulaSpec` declarativa em JSON**, validada por JSON Schema,
versionada e imutável, interpretada por um motor genérico com whitelist de funções.
Ver `docs/MOTOR-DE-FORMULA.md`.

Cada `ResultadoCalculado` grava o `formulaSpecId` e a `versao` que o produziram.

## Alternativas rejeitadas
- **Codificar a fórmula em Dart:** cada mudança exigiria release e review de loja;
  impossibilitaria manter histórico calculado com a regra antiga.
- **Interpretar JavaScript embarcado:** superfície de ataque e peso desnecessários
  para o que é, no fim, aritmética com condicionais.

## Consequências
- (+) Mudança de regra sem release; regra explicável ao usuário; histórico reprodutível.
- (+) O app pode ser desenvolvido e testado **antes** de a fórmula existir.
- (−) É preciso construir e testar parser, validador e motor — custo concentrado no
  início, com cobertura de teste exigida acima de 90%.
- (−) Risco de a fórmula real exigir construção não prevista; mitigado por
  `schemaVersion` na própria linguagem.

## Nota de fechamento (2026-08-14)

A fórmula real chegou e está implementada como `specs/formula-real-trimestral.json`,
substituindo a spec provisória sem alterar o motor. Ver
`docs/planejamento-ia/specs/2026-08-14-formula-real-e-ui.md` para o detalhamento da
fórmula, do conceito de "frentes" e da tela Início construídos em cima dela.

# ADR 0001 — Flutter como stack multiplataforma

- **Status:** Superado por [ADR 0004](0004-pivo-react-native.md)
- **Data:** 2026-08-13

## Contexto
App iOS + Android, offline-first, UI predominantemente de formulários e tabelas,
com uma regra de cálculo crítica que precisa produzir **exatamente o mesmo número**
nas duas plataformas. Equipe pequena.

## Opções
1. Flutter
2. React Native (Expo)
3. Kotlin Multiplatform + Compose/SwiftUI
4. Nativo x2 (Swift + Kotlin)

## Decisão
**Flutter 3.x.**

Fator decisivo: o motor de fórmula é escrito uma única vez em Dart e roda idêntico
nos dois sistemas. Em nativo x2 haveria duas implementações da regra de nota — duas
fontes de bug num cálculo que o usuário usa para decidir se vai estudar ou não.
Somam-se: Drift (a melhor camada SQLite tipada disponível), custo de UI baixo para
formulários densos, e ciclo de desenvolvimento curto.

## Consequências
- (+) Uma base de código, um conjunto de testes de regra de negócio.
- (+) Hot reload acelera muito o trabalho em telas de formulário.
- (−) Binário maior (~15 MB extras) e UI não-nativa por padrão — mitigado com
  Cupertino/Material adaptativos e atenção a Dynamic Type e VoiceOver.
- (−) Dependência do ciclo de release do Flutter para novidades de SO.

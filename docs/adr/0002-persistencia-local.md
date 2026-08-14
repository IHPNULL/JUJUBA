# ADR 0002 — SQLite via Drift, com gravação write-through

- **Status:** Superado por [ADR 0004](0004-pivo-react-native.md)
- **Data:** 2026-08-13

## Contexto
Requisito: gravar na memória do aparelho tudo que o usuário já digitou, além do
prospecto. O dado é relacional (ano → matérias → períodos → avaliações → notas) e
precisa de consultas agregadas e migrações ao longo de anos letivos.

## Opções
1. `shared_preferences` / chave-valor
2. Isar / Hive (NoSQL embarcado)
3. SQLite via Drift
4. Realm

## Decisão
**SQLite via Drift**, com `shared_preferences` reservado apenas a preferências de UI.

Chave-valor não suporta as agregações necessárias e transforma migração em trabalho
manual. Isar é rápido, mas o modelo é fortemente relacional e o histórico de
manutenção do pacote é menos previsível. Drift dá SQL verificado em tempo de
compilação, migrações versionadas e testáveis, e caminho aberto para SQLCipher.

## Decisões acopladas
- Notas gravadas como **inteiro escalado** (`valor_milis`), nunca `double`.
  Arredondamento é responsabilidade da `FormulaSpec`.
- **Write-through com debounce de 300 ms** + *flush* forçado no ciclo de vida
  `inactive`/`paused`. O usuário nunca perde o que digitou por o SO matar o app.
- Banco em `Library/Application Support` (iOS) e `getDatabasesPath()` (Android),
  ambos incluídos no backup do sistema.
- Caminhos de arquivo persistidos são **relativos** — o container iOS troca de UUID.

## Consequências
- (+) Consultas agregadas triviais; migrações testadas em CI.
- (−) Boilerplate de code-gen (`build_runner`).

const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".claude/worktrees/**"],
  },
  {
    // Arquivo .js puro (não .ts): a regra `no-undef` de base fica ligada
    // (nos arquivos TS ela é desligada em favor do type-checker), então o
    // global `jest` do `jest.mock(...)` precisa ser declarado à mão aqui.
    files: ["jest.setup.js"],
    languageOptions: { globals: { ...globals.jest } },
  },
];

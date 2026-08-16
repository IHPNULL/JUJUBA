const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Migrações do Drizzle (`src/data/local/db/migrations/migrations.js`) importam
// os `.sql` gerados pelo `drizzle-kit` como texto — ver
// https://orm.drizzle.team/docs/get-started/expo-new (junto com babel.config.js).
config.resolver.sourceExts.push("sql");

// `expo-sqlite` (importado por `src/data/local/db`, usado só nativo — ver
// `app/_layout.tsx`) carrega um `.wasm` no seu driver web. Esse caminho nunca
// roda no navegador (web usa `RascunhoRepositoryLocalStorage`), mas o
// bundler ainda precisa resolver o import para empacotar o bundle web.
config.resolver.assetExts.push("wasm");

module.exports = config;

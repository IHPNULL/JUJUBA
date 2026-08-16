module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Migrações do Drizzle importam `.sql` como texto — ver metro.config.js
    // e https://orm.drizzle.team/docs/get-started/expo-new.
    //
    // `react-native-worklets/plugin` (usado pelo Reanimated 4, dependência do
    // seletor de cor) precisa ser o ÚLTIMO plugin da lista.
    plugins: [["inline-import", { extensions: [".sql"] }], "react-native-worklets/plugin"],
  };
};

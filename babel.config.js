module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Migrações do Drizzle importam `.sql` como texto — ver metro.config.js
    // e https://orm.drizzle.team/docs/get-started/expo-new.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};

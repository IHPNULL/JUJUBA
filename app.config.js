/**
 * Camada dinâmica sobre `app.json`: só existe pra injetar `experiments.baseUrl`
 * a partir de `EXPO_BASE_URL` no export web (GitHub Pages serve o projeto num
 * subcaminho, ex.: usuario.github.io/JUJUBA). Sem a env var, `baseUrl` fica
 * vazio e nada muda pro dev local, iOS ou Android.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? "",
  },
});

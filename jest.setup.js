// Mocks recomendados pelas próprias libs para rodar sob Jest (sem os módulos
// nativos): reanimated-color-picker (usado no seletor de cor personalizada
// de AdicionarMateriaSheet) depende de ambas.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
require("react-native-gesture-handler/jestSetup");

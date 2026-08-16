import { useMemo, type ReactNode } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "../src/presentation/store/store";
import { UpdateBanner } from "../src/presentation/shared/components/UpdateBanner";
import { usePersistenciaInicio } from "../src/presentation/features/inicio/usePersistenciaInicio";
import type { RascunhoRepository } from "../src/domain/repositories/rascunhoRepository";
import { RascunhoRepositoryDrizzle } from "../src/data/repositories/rascunhoRepositoryDrizzle";
import { RascunhoRepositoryLocalStorage } from "../src/data/repositories/rascunhoRepositoryLocalStorage";
import { obterBancoDeDados, obterMigracoesProntas } from "../src/data/local/db/instance";
import { cores } from "../src/presentation/shared/theme";

/**
 * Web usa `localStorage` em vez de `expo-sqlite`: o driver web do
 * `expo-sqlite` exige headers COOP/COEP (`SharedArrayBuffer`) que hosts
 * estáticos como GitHub Pages (`npm run build:web`) não permitem configurar.
 */
function criarRepositorioRascunho(): { repositorio: RascunhoRepository; prontoBanco: Promise<void> } {
  if (Platform.OS === "web") {
    return { repositorio: new RascunhoRepositoryLocalStorage(window.localStorage), prontoBanco: Promise.resolve() };
  }
  return { repositorio: new RascunhoRepositoryDrizzle(obterBancoDeDados()), prontoBanco: obterMigracoesProntas() };
}

/**
 * Restaura o rascunho da tela Início antes de mostrar qualquer rota —
 * docs/ARQUITETURA.md §6 ("ao abrir uma tela, o slice carrega o rascunho
 * antes de renderizar"). Evita a tela nascer vazia e "piscar" quando o
 * rascunho salvo chega um instante depois.
 */
function ConteudoComPersistencia({ children }: { children: ReactNode }) {
  const { repositorio, prontoBanco } = useMemo(() => criarRepositorioRascunho(), []);
  const { pronto } = usePersistenciaInicio(repositorio, prontoBanco);

  if (!pronto) return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <ConteudoComPersistencia>
          <Stack screenOptions={{ headerShown: false }} />
        </ConteudoComPersistencia>
        <UpdateBanner />
      </SafeAreaProvider>
    </Provider>
  );
}

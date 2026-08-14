import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "../src/presentation/store/store";
import { UpdateBanner } from "../src/presentation/shared/components/UpdateBanner";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
        <UpdateBanner />
      </SafeAreaProvider>
    </Provider>
  );
}

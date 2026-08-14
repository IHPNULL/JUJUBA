import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import specExemplo from "../specs/exemplo-media-bimestral.json";
import { FormulaSpec } from "../src/domain/formula/types";
import { especificarFormulaAtiva } from "../src/presentation/store/specSlice";
import { useAppDispatch, useAppSelector } from "../src/presentation/store/hooks";

export default function Inicio() {
  const dispatch = useAppDispatch();
  const spec = useAppSelector((state) => state.spec.ativa);

  useEffect(() => {
    dispatch(especificarFormulaAtiva(specExemplo as FormulaSpec));
  }, [dispatch]);

  return (
    <SafeAreaView style={estilos.container}>
      <Text style={estilos.titulo}>Jujuba</Text>
      <Text style={estilos.subtitulo}>Notas escolares</Text>
      {spec?.provisoria && <Text style={estilos.selo}>Regra provisória: {spec.nome}</Text>}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  titulo: { fontSize: 32, fontWeight: "700" },
  subtitulo: { fontSize: 16, color: "#666" },
  selo: { marginTop: 24, fontSize: 12, color: "#a15c00", backgroundColor: "#fff3cd", padding: 8, borderRadius: 6 },
});

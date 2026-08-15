import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores } from "../../shared/theme";
import { TERMOS } from "../../store/inicioSlice";

const iconeJujuba = require("../../../../assets/jujuba-icon.jpeg");

interface HeaderInicioProps {
  termoSelecionado: string;
  onSelecionarTermo: (termo: string) => void;
}

export function HeaderInicio({ termoSelecionado, onSelecionarTermo }: HeaderInicioProps) {
  return (
    <View style={estilos.container}>
      <View style={estilos.linhaSaudacao}>
        <Image source={iconeJujuba} style={estilos.icone} />
        <View>
          <Text style={estilos.saudacao}>Oi!</Text>
          <Text style={estilos.subtitulo}>Digite suas notas e veja a média na hora</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chips}>
        {TERMOS.map((termo) => {
          const selecionado = termo === termoSelecionado;
          return (
            <TouchableOpacity
              key={termo}
              onPress={() => onSelecionarTermo(termo)}
              style={[estilos.chip, { backgroundColor: selecionado ? cores.branco : "rgba(255,255,255,0.18)" }]}
            >
              <Text style={[estilos.chipTexto, { color: selecionado ? cores.rosa : cores.branco }]}>{termo}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { backgroundColor: cores.rosa, paddingTop: 32, paddingHorizontal: 20, paddingBottom: 44 },
  linhaSaudacao: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 52, height: 52, borderRadius: 26 },
  saudacao: { fontWeight: "700", fontSize: 20, color: cores.branco },
  subtitulo: { fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: "600", marginTop: 2 },
  chips: { marginTop: 18 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginRight: 8 },
  chipTexto: { fontSize: 12.5, fontWeight: "700" },
});

import Constants from "expo-constants";
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores } from "../../shared/theme";
import { IconeFeedback } from "../../shared/components/IconeFeedback";
import { montarUrlDeFeedback } from "../../shared/feedback";
import { TERMOS } from "../../store/inicioSlice";

const iconeJujuba = require("../../../../assets/jujuba-icon.jpeg");

interface HeaderInicioProps {
  termoSelecionado: string;
  onSelecionarTermo: (termo: string) => void;
}

export function HeaderInicio({ termoSelecionado, onSelecionarTermo }: HeaderInicioProps) {
  function abrirFeedback() {
    const url = montarUrlDeFeedback({
      versao: Constants.expoConfig?.version,
      plataforma: Platform.OS,
    });
    // Sem `await`: falha de abertura (nenhum navegador disponível) não deve
    // derrubar a tela — o toque simplesmente não faz nada visível.
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.linhaSaudacao}>
        <Image source={iconeJujuba} style={estilos.icone} />
        <View style={estilos.blocoSaudacao}>
          <Text style={estilos.saudacao}>Oi!</Text>
          <Text style={estilos.subtitulo}>Digite suas notas e veja a média na hora</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Enviar feedback"
          accessibilityHint="Abre um formulário no navegador para relatar um problema ou sugerir uma ideia"
          onPress={abrirFeedback}
          style={estilos.botaoFeedback}
        >
          <IconeFeedback tamanho={24} cor="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
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
  /** `minWidth: 0` deixa o subtítulo quebrar em vez de empurrar o botão de
   *  feedback para fora da tela em larguras de celular. */
  blocoSaudacao: { flexShrink: 1, minWidth: 0 },
  /** Contorno em vez de fundo chapado: dá a leitura de botão sem competir
   *  com a saudação. O padding mantém a área de toque em ~44pt. */
  botaoFeedback: {
    marginLeft: "auto",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  icone: { width: 52, height: 52, borderRadius: 26 },
  saudacao: { fontWeight: "700", fontSize: 20, color: cores.branco },
  subtitulo: { fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: "600", marginTop: 2 },
  chips: { marginTop: 18 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginRight: 8 },
  chipTexto: { fontSize: 12.5, fontWeight: "700" },
});

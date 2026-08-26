import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores } from "../theme";
import type { Novidade } from "../novidades";

interface ModalNovidadesProps {
  /** `null` quando não há novidade a mostrar — o modal fica fechado. */
  novidade: Novidade | null;
  onFechar: () => void;
}

/**
 * "O que há de novo": abre sozinho na primeira vez que o app roda numa versão
 * nova (quem decide é `useNovidades`) e some para sempre naquela versão assim
 * que é fechado.
 *
 * Card centralizado, e não a folha de baixo de `AdicionarMateriaSheet`: aqui
 * não há formulário nem teclado, e o conteúdo é curto — o card no meio da
 * tela lê como aviso, a folha leria como "faça alguma coisa".
 */
export function ModalNovidades({ novidade, onFechar }: ModalNovidadesProps) {
  return (
    <Modal visible={novidade !== null} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.envolucro}>
        <TouchableOpacity style={estilos.fundo} activeOpacity={1} onPress={onFechar} />
        <View style={estilos.card}>
          <Text style={estilos.sobretitulo}>Versão {novidade?.versao}</Text>
          <Text style={estilos.titulo}>O que há de novo</Text>

          {/* A lista rola sozinha quando a versão traz muita coisa; o card
              para de crescer antes de encostar nas bordas da tela. */}
          <ScrollView style={estilos.lista} contentContainerStyle={estilos.listaConteudo}>
            {novidade?.itens.map((item) => (
              <View key={item} style={estilos.item}>
                <View style={estilos.marcador} />
                <Text style={estilos.textoItem}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity accessibilityRole="button" onPress={onFechar} style={estilos.botao}>
            <Text style={estilos.textoBotao}>Beleza!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  envolucro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  /** Cobre a tela inteira por trás do card, para o toque fora fechar. */
  fundo: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(58,36,24,0.45)" },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: cores.branco,
    borderRadius: 26,
    padding: 22,
  },
  sobretitulo: { fontSize: 12, fontWeight: "700", color: cores.rosa, letterSpacing: 0.6 },
  titulo: { fontSize: 21, fontWeight: "700", color: cores.texto, marginTop: 4 },
  /** `flexGrow: 0` deixa o ScrollView encolher até o tamanho do conteúdo:
   *  com poucos itens o card fica baixo, em vez de esticar até o teto. */
  lista: { flexGrow: 0, marginTop: 16 },
  listaConteudo: { gap: 14 },
  item: { flexDirection: "row", gap: 10 },
  /** `marginTop` alinha a bolinha com a primeira linha do texto. */
  marcador: { width: 7, height: 7, borderRadius: 4, backgroundColor: cores.rosa, marginTop: 7 },
  textoItem: { flex: 1, fontSize: 14.5, lineHeight: 21, color: cores.texto },
  botao: {
    marginTop: 22,
    height: 50,
    borderRadius: 15,
    backgroundColor: cores.rosa,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotao: { fontSize: 15.5, fontWeight: "700", color: cores.branco },
});

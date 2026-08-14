import Decimal from "decimal.js";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { arredondarEFormatar } from "../../../domain/formula/exibicao";
import { Escala } from "../../../domain/formula/types";
import { ProgressRing } from "../../shared/components/ProgressRing";
import { cores } from "../../shared/theme";

interface CartaoMetaProps {
  escala: Escala;
  mediaGeral: Decimal;
  termoSelecionado: string;
  quantidadeMaterias: number;
  meta: number;
  onMetaMenos: () => void;
  onMetaMais: () => void;
  onSimularTudo: () => void;
  onLimparSimulados: () => void;
  temSimulados: boolean;
}

export function CartaoMeta({
  escala,
  mediaGeral,
  termoSelecionado,
  quantidadeMaterias,
  meta,
  onMetaMenos,
  onMetaMais,
  onSimularTudo,
  onLimparSimulados,
  temSimulados,
}: CartaoMetaProps) {
  const { arredondado: mediaGeralArredondada, texto: mediaGeralTexto } = arredondarEFormatar(
    mediaGeral,
    escala
  );
  const metaTexto = arredondarEFormatar(new Decimal(meta), escala).texto;

  return (
    <View style={estilos.cartao}>
      <View style={estilos.linhaResumo}>
        <ProgressRing progresso={mediaGeralArredondada.toNumber() / 10} rotulo={mediaGeralTexto} />
        <View style={estilos.resumoTexto}>
          <Text style={estilos.rotuloResumo}>Média geral · {termoSelecionado}</Text>
          <Text style={estilos.valorResumo}>
            {quantidadeMaterias} {quantidadeMaterias === 1 ? "matéria" : "matérias"}
          </Text>
          <Text style={estilos.formula}>(AT×2 + Obj + SAEP) ÷ 4 + tarefa</Text>
        </View>
      </View>

      <View style={estilos.linhaMeta}>
        <View>
          <Text style={estilos.rotuloMeta}>Meta de média</Text>
          <Text style={estilos.subtituloMeta}>Usada na simulação</Text>
        </View>
        <View style={estilos.stepper}>
          <TouchableOpacity onPress={onMetaMenos} style={estilos.botaoStepper}>
            <Text style={estilos.textoStepper}>−</Text>
          </TouchableOpacity>
          <Text style={estilos.valorMeta}>{metaTexto}</Text>
          <TouchableOpacity onPress={onMetaMais} style={estilos.botaoStepper}>
            <Text style={estilos.textoStepper}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.linhaAcoes}>
        <TouchableOpacity onPress={onSimularTudo} style={estilos.botaoSimular}>
          <Text style={estilos.textoBotaoSimular}>Simular mínimo p/ {metaTexto}</Text>
        </TouchableOpacity>
        {temSimulados && (
          <TouchableOpacity onPress={onLimparSimulados} style={estilos.botaoLimpar}>
            <Text style={estilos.textoBotaoLimpar}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    marginTop: -30,
    marginHorizontal: 20,
    backgroundColor: cores.branco,
    borderRadius: 22,
    padding: 18,
    shadowColor: cores.rosaEscuro,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  linhaResumo: { flexDirection: "row", alignItems: "center", gap: 16 },
  resumoTexto: { flex: 1 },
  rotuloResumo: { fontSize: 12.5, color: cores.textoSuave, fontWeight: "700" },
  valorResumo: { fontWeight: "700", fontSize: 15, color: cores.texto, marginTop: 2 },
  formula: { fontSize: 11.5, color: cores.textoFraco, fontWeight: "600", marginTop: 4 },
  linhaMeta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rotuloMeta: { fontSize: 12, fontWeight: "700", color: cores.textoSuave },
  subtituloMeta: { fontSize: 11.5, fontWeight: "600", color: cores.textoFraco, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  botaoStepper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.douradoClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  textoStepper: { color: cores.dourado, fontWeight: "800", fontSize: 18 },
  valorMeta: { fontWeight: "800", fontSize: 20, color: cores.texto, minWidth: 44, textAlign: "center" },
  linhaAcoes: { flexDirection: "row", gap: 8, marginTop: 14 },
  botaoSimular: {
    flex: 1,
    alignItems: "center",
    backgroundColor: cores.rosa,
    padding: 13,
    borderRadius: 14,
  },
  textoBotaoSimular: { color: cores.branco, fontWeight: "700", fontSize: 13.5 },
  botaoLimpar: { alignItems: "center", backgroundColor: cores.cartaoFundo, padding: 13, paddingHorizontal: 15, borderRadius: 14 },
  textoBotaoLimpar: { color: cores.textoSuave, fontWeight: "700", fontSize: 13.5 },
});

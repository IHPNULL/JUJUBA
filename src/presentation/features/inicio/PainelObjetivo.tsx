import { StyleSheet, Text, View } from "react-native";
import { arredondarEFormatar } from "../../../domain/formula/exibicao";
import { FormulaSpec } from "../../../domain/formula/types";
import { PONTOS_OBJETIVO } from "../../../domain/objetivo/tipos";
import { cores } from "../../shared/theme";
import { ObjetivoDaMateria, sugestaoPorComponente } from "./objetivoDaMateria";

interface PainelObjetivoProps {
  spec: FormulaSpec;
  objetivo: ObjetivoDaMateria;
  /** Rótulo curto de cada componente, na ordem em que a tela os mostra. */
  rotulos: Record<string, string>;
  termoSelecionado: string;
}

/** Formata pontos anuais: escala de 0 a 40, uma casa decimal e vírgula. */
function pontosTexto(valor: { toDecimalPlaces: (n: number) => { toNumber: () => number } }): string {
  return valor.toDecimalPlaces(1).toNumber().toString().replace(".", ",");
}

/**
 * Objetivo anual da matéria: 24 pontos somando T1 + T2 + 2×T3.
 *
 * Mostra três coisas, nesta ordem de importância: quanto já está garantido,
 * quanto ainda falta, e o que tirar nas provas que faltam para fechar com o
 * menor esforço. Quando o trimestre em tela ficou abaixo da meta, entra
 * também a linha de recuperação.
 *
 * "Garantido" aqui é literal: campo em aberto conta como zero. O número
 * nunca embute nota que o aluno ainda não tirou.
 */
export function PainelObjetivo({ spec, objetivo, rotulos, termoSelecionado }: PainelObjetivoProps) {
  const { pontos, sugestao, recuperacao } = objetivo;
  const totalTexto = pontosTexto(PONTOS_OBJETIVO);

  const proporcao = Math.min(1, pontos.garantidos.div(PONTOS_OBJETIVO).toNumber());
  const corBarra = pontos.alcancado ? cores.sucesso : pontos.inalcancavel ? cores.erro : cores.roxo;

  const sugeridos = sugestaoPorComponente(sugestao);

  return (
    <View style={estilos.painel}>
      <View style={estilos.linhaTopo}>
        <Text style={estilos.titulo}>Objetivo do ano</Text>
        <Text style={estilos.contador} testID="objetivo-contador">
          {pontosTexto(pontos.garantidos)} de {totalTexto}
        </Text>
      </View>

      <View style={estilos.trilha}>
        <View style={[estilos.preenchimento, { width: `${proporcao * 100}%`, backgroundColor: corBarra }]} />
      </View>

      {pontos.alcancado ? (
        <Text style={[estilos.linha, { color: cores.sucesso }]}>
          Objetivo alcançado — os {totalTexto} pontos já estão garantidos.
        </Text>
      ) : pontos.inalcancavel ? (
        <Text style={[estilos.linha, { color: cores.erro }]}>
          Nem com nota máxima no que falta dá para chegar aos {totalTexto} — o máximo possível agora é{" "}
          {pontosTexto(pontos.maximoPossivel)}.
        </Text>
      ) : (
        <Text style={estilos.linha}>
          Faltam {pontosTexto(pontos.falta)} pontos. O 3º trimestre vale dobrado.
        </Text>
      )}

      {sugestao.tipo === "sugestao" && sugeridos.size > 0 && (
        <Text style={estilos.linha} testID="objetivo-sugestao">
          Menor esforço:{" "}
          {[...sugeridos.entries()]
            .map(([componente, nota]) => `${rotulos[componente] ?? componente} ${arredondarEFormatar(nota, spec.escala).texto}`)
            .join(" · ")}{" "}
          em cada campo em aberto.
        </Text>
      )}

      {recuperacao.tipo === "precisa" && (
        <Text style={[estilos.linha, estilos.recuperacao]} testID="objetivo-recuperacao">
          {termoSelecionado} abaixo da meta: tire{" "}
          {arredondarEFormatar(recuperacao.notaNecessaria, spec.escala).texto} na recuperação e use no lugar
          da {rotulos[recuperacao.componente] ?? recuperacao.componente} — é onde rende mais. A média do
          trimestre vai para {arredondarEFormatar(recuperacao.mediaResultante, spec.escala).texto}.
        </Text>
      )}

      {recuperacao.tipo === "impossivel" && (
        <Text style={[estilos.linha, { color: cores.erro }]} testID="objetivo-recuperacao">
          Nem com 10 na recuperação a meta do {termoSelecionado} é alcançada — o máximo é{" "}
          {arredondarEFormatar(recuperacao.melhorMedia, spec.escala).texto}.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  painel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    gap: 6,
  },
  linhaTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titulo: { fontSize: 13, fontWeight: "600", color: cores.textoSuave },
  contador: { fontSize: 13, fontWeight: "700", color: cores.texto, fontVariant: ["tabular-nums"] },
  trilha: { height: 6, borderRadius: 3, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  preenchimento: { height: "100%", borderRadius: 3 },
  linha: { fontSize: 12, lineHeight: 17, color: cores.textoSuave },
  recuperacao: { color: cores.texto },
});

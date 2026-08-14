import Decimal from "decimal.js";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { avaliarPeriodo, mediaEntreFrentes } from "../../../domain/formula/motorDeCalculo";
import { resolverMinimosComponentes } from "../../../domain/formula/componentGoalSolver";
import { arredondarEFormatar } from "../../../domain/formula/exibicao";
import { FormulaSpec } from "../../../domain/formula/types";
import { chaveSimulado, Materia, NotasFrente } from "../../store/inicioSlice";
import { cores, paletaMateria } from "../../shared/theme";

interface CartaoMateriaProps {
  spec: FormulaSpec;
  materia: Materia;
  termoSelecionado: string;
  meta: number;
  simulados: Record<string, boolean>;
  onDefinirNota: (frenteId: string, componente: keyof NotasFrente, valor: string) => void;
  onSimularMateria: () => void;
  onRemover: () => void;
}

const ROTULOS_COMPONENTE: Record<keyof NotasFrente, string> = {
  at: "AT",
  ao: "Obj",
  saep: "SAEP",
  tarefa: "Tarefa",
};

function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

export function CartaoMateria({
  spec,
  materia,
  termoSelecionado,
  meta,
  simulados,
  onDefinirNota,
  onSimularMateria,
  onRemover,
}: CartaoMateriaProps) {
  const cor = paletaMateria[materia.cor];

  const mediasFrentes = materia.frentes.map((frente) => {
    const notas = frente.notas[termoSelecionado];
    return avaliarPeriodo(spec, {
      at: paraDecimal(notas?.at ?? ""),
      ao: paraDecimal(notas?.ao ?? ""),
      saep: paraDecimal(notas?.saep ?? ""),
      tarefa: paraDecimal(notas?.tarefa ?? ""),
    });
  });
  const mediaMateria = mediaEntreFrentes(mediasFrentes);
  const { arredondado: mediaMateriaArredondada, texto: mediaMateriaTexto } = arredondarEFormatar(
    mediaMateria,
    spec.escala
  );
  const alcancouMeta = mediaMateriaArredondada.gte(new Decimal(meta));
  const metaTexto = arredondarEFormatar(new Decimal(meta), spec.escala).texto;

  const resultadosMinimos = materia.frentes.map((frente) => {
    const notas = frente.notas[termoSelecionado];

    function valorOuVazio(componente: keyof NotasFrente): Decimal | null {
      const valor = notas?.[componente];
      if (!valor) return null;
      const chave = chaveSimulado(materia.id, termoSelecionado, frente.id, componente);
      if (simulados[chave]) return null;
      return paraDecimal(valor);
    }

    const preenchidos: Record<string, Decimal | null> = {
      at: valorOuVazio("at"),
      ao: valorOuVazio("ao"),
      saep: valorOuVazio("saep"),
      tarefa: valorOuVazio("tarefa"),
    };
    return resolverMinimosComponentes(spec, preenchidos, new Decimal(meta));
  });
  const algumImpossivel = resultadosMinimos.some((resultado) => resultado.tipo === "impossivel");
  const algumComVazios = resultadosMinimos.some((resultado) => resultado.tipo !== "semVazios");

  let dicaTexto: string;
  let dicaCor: string | undefined;
  if (algumImpossivel) {
    dicaTexto = `Nem com nota máxima nas que faltam dá ${metaTexto}.`;
    dicaCor = cores.erro;
  } else if (algumComVazios && !alcancouMeta) {
    dicaTexto = "Faltam notas nesta matéria.";
    dicaCor = cores.textoFraco;
  } else {
    dicaTexto = alcancouMeta ? "Meta alcançada." : "Faltam notas ou a média está abaixo da meta.";
    dicaCor = undefined;
  }

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalho}>
        <View style={estilos.cabecalhoEsquerda}>
          <View style={[estilos.marcador, { backgroundColor: cor.cor }]} />
          <Text style={estilos.nome}>{materia.nome}</Text>
          {materia.frentes.length > 1 && (
            <View style={estilos.selo2Frentes}>
              <Text style={estilos.textoSelo2Frentes}>2 frentes</Text>
            </View>
          )}
        </View>
        <View style={estilos.cabecalhoDireita}>
          <View style={[estilos.badge, { backgroundColor: alcancouMeta ? cores.sucessoFundo : cores.erroFundo }]}>
            <Text style={[estilos.textoBadge, { color: alcancouMeta ? cores.sucesso : cores.erro }]}>
              {mediaMateriaTexto}
            </Text>
          </View>
          <TouchableOpacity onPress={onRemover} style={estilos.botaoRemover}>
            <Text style={estilos.textoRemover}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {materia.frentes.map((frente, indice) => {
        const notas = frente.notas[termoSelecionado];
        const mediaFrente = mediasFrentes[indice];
        return (
          <View key={frente.id} style={estilos.blocoFrente}>
            {materia.frentes.length > 1 && (
              <View style={estilos.linhaRotuloFrente}>
                <Text style={estilos.rotuloFrente}>{frente.nome}</Text>
                <Text style={estilos.mediaFrente}>
                  média {arredondarEFormatar(mediaFrente, spec.escala).texto}
                </Text>
              </View>
            )}
            <View style={estilos.linhaCampos}>
              {(Object.keys(ROTULOS_COMPONENTE) as (keyof NotasFrente)[]).map((componente) => (
                <View key={componente} style={estilos.campo}>
                  <Text style={estilos.rotuloCampo}>{ROTULOS_COMPONENTE[componente]}</Text>
                  <TextInput
                    value={notas?.[componente] ?? ""}
                    onChangeText={(valor) => onDefinirNota(frente.id, componente, valor)}
                    placeholder="0,0"
                    inputMode="decimal"
                    style={estilos.entrada}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <View style={estilos.rodape}>
        <Text style={[estilos.dica, dicaCor ? { color: dicaCor } : null]}>{dicaTexto}</Text>
        <TouchableOpacity onPress={onSimularMateria} style={estilos.botaoMinimo}>
          <Text style={estilos.textoBotaoMinimo}>Mínimo p/ {metaTexto}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.branco, borderRadius: 20, padding: 15, marginBottom: 12 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cabecalhoEsquerda: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1 },
  marcador: { width: 10, height: 10, borderRadius: 5 },
  nome: { fontWeight: "700", fontSize: 15, color: cores.texto },
  selo2Frentes: { backgroundColor: cores.roxoClaro, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  textoSelo2Frentes: { fontSize: 10.5, fontWeight: "800", color: cores.roxo },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999 },
  textoBadge: { fontWeight: "800", fontSize: 13 },
  botaoRemover: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cores.cartaoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  textoRemover: { color: cores.textoFraco, fontSize: 14, fontWeight: "700" },
  blocoFrente: { marginTop: 13 },
  linhaRotuloFrente: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  rotuloFrente: { fontSize: 11.5, fontWeight: "800", color: cores.roxo },
  mediaFrente: { fontSize: 11.5, fontWeight: "700", color: cores.textoFraco },
  linhaCampos: { flexDirection: "row", gap: 8 },
  campo: { flex: 1, gap: 4 },
  rotuloCampo: { fontSize: 10.5, fontWeight: "800", color: cores.textoSuave, textAlign: "center" },
  entrada: {
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: cores.bordaCartao,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
  },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13 },
  dica: { flex: 1, fontSize: 11.5, fontWeight: "700", color: cores.textoFraco },
  botaoMinimo: { backgroundColor: cores.rosaClaro, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12 },
  textoBotaoMinimo: { color: cores.rosa, fontSize: 12, fontWeight: "800" },
});

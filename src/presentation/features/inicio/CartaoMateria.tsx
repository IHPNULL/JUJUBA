import Decimal from "decimal.js";
import { useRef } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { avaliarPeriodo, mediaDaMateriaNoPeriodo } from "../../../domain/formula/motorDeCalculo";
import { resolverMinimosComponentes } from "../../../domain/formula/componentGoalSolver";
import { arredondarEFormatar } from "../../../domain/formula/exibicao";
import { FormulaSpec } from "../../../domain/formula/types";
import { chaveSimulado, Materia, NotasFrente } from "../../store/inicioSlice";
import { cores } from "../../shared/theme";
import { COMPONENTES, entradasDoSolver, normalizarNota, paraDecimal } from "./simulacao";
import { calcularObjetivoDaMateria } from "./objetivoDaMateria";
import { PainelObjetivo } from "./PainelObjetivo";

interface CartaoMateriaProps {
  spec: FormulaSpec;
  materia: Materia;
  termoSelecionado: string;
  meta: number;
  simulados: Record<string, boolean>;
  onDefinirNota: (frenteId: string, componente: keyof NotasFrente, valor: string) => void;
  onSimularMateria: () => void;
  onRemover: () => void;
  onFocarCampo?: (campo: TextInput | null) => void;
}

const ROTULOS_COMPONENTE: Record<keyof NotasFrente, string> = {
  at: "AT",
  ao: "Obj",
  saep: "SAEP",
  tarefa: "Tarefa",
};

interface CampoNotaProps {
  rotulo: string;
  valor: string;
  /** Valor veio de uma simulação, não do teclado do usuário. */
  simulado: boolean;
  notaMaxima?: number;
  onMudar: (valor: string) => void;
  onFocar?: (campo: TextInput | null) => void;
}

/**
 * Componente próprio (e não um `TextInput` solto dentro do `.map`) porque
 * cada campo precisa da própria `ref` para ser medido quando o teclado abre —
 * e `useRef` não pode ser chamado dentro de um laço de renderização.
 */
function CampoNota({ rotulo, valor, simulado, notaMaxima, onMudar, onFocar }: CampoNotaProps) {
  const referencia = useRef<TextInput>(null);

  /** Tira zero à esquerda e corta em 2 casas decimais antes de checar o
   *  teto do componente (`notaMaxima` vem da spec — ex.: Tarefa vale no
   *  máximo 1) — um dígito que estoura o teto é recusado. */
  function aoMudar(texto: string) {
    const normalizado = normalizarNota(texto);
    if (notaMaxima !== undefined && normalizado.trim() !== "" && paraDecimal(normalizado).gt(notaMaxima)) return;
    onMudar(normalizado);
  }

  const digitadoPeloUsuario = valor.trim() !== "" && !simulado;

  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotuloCampo}>{rotulo}</Text>
      <TextInput
        ref={referencia}
        value={valor}
        onChangeText={aoMudar}
        onFocus={() => onFocar?.(referencia.current)}
        placeholder="0,0"
        inputMode="decimal"
        style={[estilos.entrada, digitadoPeloUsuario && estilos.entradaPreenchida]}
      />
    </View>
  );
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
  onFocarCampo,
}: CartaoMateriaProps) {
  const notasDasFrentes = materia.frentes.map((frente) => {
    const notas = frente.notas[termoSelecionado];
    return {
      at: paraDecimal(notas?.at ?? ""),
      ao: paraDecimal(notas?.ao ?? ""),
      saep: paraDecimal(notas?.saep ?? ""),
      tarefa: paraDecimal(notas?.tarefa ?? ""),
    };
  });
  // A média de cada frente é uma nota reportada por si só, então aparece
  // arredondada. A da matéria NÃO sai da média dessas já arredondadas — ver
  // `mediaDaMateriaNoPeriodo`.
  const mediasFrentes = notasDasFrentes.map((notas) => avaliarPeriodo(spec, notas));
  const mediaMateria = mediaDaMateriaNoPeriodo(spec, notasDasFrentes);
  const { arredondado: mediaMateriaArredondada, texto: mediaMateriaTexto } = arredondarEFormatar(
    mediaMateria,
    spec.escala
  );
  const alcancouMeta = mediaMateriaArredondada.gte(new Decimal(meta));
  const metaTexto = arredondarEFormatar(new Decimal(meta), spec.escala).texto;

  const resultadosMinimos = materia.frentes.map((frente) =>
    resolverMinimosComponentes(
      spec,
      entradasDoSolver(materia, frente.id, termoSelecionado, simulados),
      new Decimal(meta)
    )
  );
  const objetivo = calcularObjetivoDaMateria(spec, materia, termoSelecionado, meta, simulados);

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
          <View
            testID={`marcador-cor-${materia.nome}`}
            style={[estilos.marcador, { backgroundColor: materia.cor }]}
          />
          <Text style={estilos.nome}>{materia.nome}</Text>
          {materia.frentes.length > 1 && (
            <View style={estilos.selo2Frentes}>
              <Text style={estilos.textoSelo2Frentes}>{materia.frentes.length} frentes</Text>
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
              {COMPONENTES.map((componente) => (
                <CampoNota
                  key={componente}
                  rotulo={ROTULOS_COMPONENTE[componente]}
                  valor={notas?.[componente] ?? ""}
                  simulado={
                    !!simulados[chaveSimulado(materia.id, termoSelecionado, frente.id, componente)]
                  }
                  notaMaxima={spec.componentes.find((c) => c.id === componente)?.notaMaxima}
                  onMudar={(valor) => onDefinirNota(frente.id, componente, valor)}
                  onFocar={onFocarCampo}
                />
              ))}
            </View>
          </View>
        );
      })}

      <PainelObjetivo
        spec={spec}
        objetivo={objetivo}
        rotulos={ROTULOS_COMPONENTE}
        termoSelecionado={termoSelecionado}
      />

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
  /** Campo já preenchido pelo aluno — acento rosa pra diferenciar de
   *  campos ainda vazios. Valores calculados mantêm a cor original. */
  entradaPreenchida: {
    borderColor: cores.rosa,
    backgroundColor: cores.rosaClaro,
  },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13 },
  dica: { flex: 1, fontSize: 11.5, fontWeight: "700", color: cores.textoFraco },
  botaoMinimo: { backgroundColor: cores.rosaClaro, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12 },
  textoBotaoMinimo: { color: cores.rosa, fontSize: 12, fontWeight: "800" },
});

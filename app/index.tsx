import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import specReal from "../specs/formula-real-trimestral.json";
import { avaliarPeriodo, mediaEntreFrentes } from "../src/domain/formula/motorDeCalculo";
import { resolverMinimosComponentes } from "../src/domain/formula/componentGoalSolver";
import { FormulaSpec } from "../src/domain/formula/types";
import { especificarFormulaAtiva } from "../src/presentation/store/specSlice";
import {
  adicionarMateria,
  chaveSimulado,
  definirMeta,
  definirNotaComponente,
  limitarMeta,
  limparSimulados,
  Materia,
  NotasFrente,
  removerMateria,
  selecionarTermo,
} from "../src/presentation/store/inicioSlice";
import { useAppDispatch, useAppSelector } from "../src/presentation/store/hooks";
import { HeaderInicio } from "../src/presentation/features/inicio/HeaderInicio";
import { CartaoMeta } from "../src/presentation/features/inicio/CartaoMeta";
import { CartaoMateria } from "../src/presentation/features/inicio/CartaoMateria";
import { AdicionarMateriaSheet } from "../src/presentation/features/inicio/AdicionarMateriaSheet";
import {
  CampoDigitado,
  COMPONENTES,
  entradasDoSolver,
  frenteTemSimulado,
  paraDecimal,
} from "../src/presentation/features/inicio/simulacao";
import { useCampoVisivelComTeclado } from "../src/presentation/shared/hooks/useCampoVisivelComTeclado";
import { CorMateria, cores } from "../src/presentation/shared/theme";

const spec = specReal as FormulaSpec;

function mediaDaMateria(materia: Materia, termo: string): Decimal {
  const medias = materia.frentes.map((frente) => {
    const notas = frente.notas[termo];
    return avaliarPeriodo(spec, {
      at: paraDecimal(notas?.at ?? ""),
      ao: paraDecimal(notas?.ao ?? ""),
      saep: paraDecimal(notas?.saep ?? ""),
      tarefa: paraDecimal(notas?.tarefa ?? ""),
    });
  });
  return mediaEntreFrentes(medias);
}

export default function Inicio() {
  const dispatch = useAppDispatch();
  const { termoSelecionado, meta, materias, simulados } = useAppSelector((state) => state.inicio);
  const [sheetAberto, setSheetAberto] = useState(false);
  const { referenciaDaLista, aoFocarCampo, aoRolar } = useCampoVisivelComTeclado<Materia>();

  useEffect(() => {
    dispatch(especificarFormulaAtiva(spec));
  }, [dispatch]);

  const mediaGeral = materias.length
    ? mediaEntreFrentes(materias.map((materia) => mediaDaMateria(materia, termoSelecionado)))
    : new Decimal(0);

  function definirCampo(
    materia: Materia,
    frenteId: string,
    componente: keyof NotasFrente,
    valor: string,
    simulado: boolean
  ) {
    dispatch(definirNotaComponente({ materiaId: materia.id, frenteId, componente, valor, simulado }));
  }

  /** Esvazia só os campos que a simulação preencheu — o que o usuário digitou fica. */
  function apagarSimuladosDaFrente(materia: Materia, frenteId: string, exceto?: keyof NotasFrente) {
    COMPONENTES.forEach((componente) => {
      if (componente === exceto) return;
      const chave = chaveSimulado(materia.id, termoSelecionado, frenteId, componente);
      if (simulados[chave]) definirCampo(materia, frenteId, componente, "", false);
    });
  }

  function simularFrente(
    materia: Materia,
    frenteId: string,
    metaAlvo: number = meta,
    digitadoAgora?: CampoDigitado
  ) {
    const entradas = entradasDoSolver(materia, frenteId, termoSelecionado, simulados, digitadoAgora);
    const resultado = resolverMinimosComponentes(spec, entradas, new Decimal(metaAlvo));

    if (resultado.tipo !== "valores" && resultado.tipo !== "jaAlcancado") {
      // Meta inalcançável (ou nada a preencher): manter na tela os números de
      // uma simulação anterior seria mostrar um plano que não entrega a meta
      // atual. Limpa o que a simulação tinha posto; o que o usuário digitou
      // fica (`entradasDoSolver` já o distingue).
      const temSimulado = frenteTemSimulado(
        materia,
        frenteId,
        termoSelecionado,
        simulados,
        digitadoAgora?.componente
      );
      if (resultado.tipo === "impossivel" && temSimulado) {
        apagarSimuladosDaFrente(materia, frenteId, digitadoAgora?.componente);
      }
      return;
    }

    Object.entries(resultado.valores).forEach(([componente, valor]) => {
      // Nunca escrever por cima do campo em que o usuário está digitando.
      if (componente === digitadoAgora?.componente) return;
      definirCampo(
        materia,
        frenteId,
        componente as keyof NotasFrente,
        valor.toFixed(spec.escala.casasDecimais).replace(".", ","),
        true
      );
    });
  }

  /**
   * Digitar numa nota é responder "e se eu tirar isto?" — os campos que a
   * simulação preencheu na MESMA frente são a consequência dessa resposta e
   * precisam acompanhar na hora, sem exigir um toque no "Mínimo p/".
   * Só a frente editada recalcula; as outras não têm relação com esse valor.
   *
   * Campo esvaziado não dispara resimulação: apagar para redigitar passa por
   * um estado vazio intermediário, e recalcular ali encheria a linha de
   * números com base num valor que o usuário ainda está escrevendo.
   */
  function digitarNota(
    materia: Materia,
    frenteId: string,
    componente: keyof NotasFrente,
    valor: string
  ) {
    definirCampo(materia, frenteId, componente, valor, false);
    if (!valor.trim()) return;
    if (!frenteTemSimulado(materia, frenteId, termoSelecionado, simulados, componente)) return;
    simularFrente(materia, frenteId, meta, { componente, valor });
  }

  /** Cuidado ao chamar: `materias.forEach(simularMateria)` passaria o índice como `metaAlvo`. */
  function simularMateria(materia: Materia, metaAlvo: number = meta) {
    materia.frentes.forEach((frente) => simularFrente(materia, frente.id, metaAlvo));
  }

  /**
   * Mexer na meta não muda só o texto dos botões: os campos que a simulação
   * preencheu são a resposta à pergunta "quanto falta para bater a meta", e
   * ficariam respondendo à meta antiga. Reaplica a simulação, com a meta
   * nova, em toda frente que já tem campo simulado — as demais ficam
   * intocadas, para não preencher matéria que o usuário nunca simulou.
   */
  function alterarMeta(novaMeta: number) {
    const metaAplicada = limitarMeta(novaMeta);
    dispatch(definirMeta(metaAplicada));
    materias.forEach((materia) =>
      materia.frentes.forEach((frente) => {
        if (frenteTemSimulado(materia, frente.id, termoSelecionado, simulados)) {
          simularFrente(materia, frente.id, metaAplicada);
        }
      })
    );
  }

  return (
    <SafeAreaView style={estilos.container} edges={["bottom"]}>
      <FlatList
        ref={referenciaDaLista}
        onScroll={aoRolar}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        data={materias}
        keyExtractor={(materia) => materia.id}
        ListHeaderComponent={
          <>
            <HeaderInicio termoSelecionado={termoSelecionado} onSelecionarTermo={(t) => dispatch(selecionarTermo(t))} />
            <CartaoMeta
              escala={spec.escala}
              mediaGeral={mediaGeral}
              termoSelecionado={termoSelecionado}
              quantidadeMaterias={materias.length}
              meta={meta}
              onMetaMenos={() => alterarMeta(meta - 0.5)}
              onMetaMais={() => alterarMeta(meta + 0.5)}
              onSimularTudo={() => materias.forEach((materia) => simularMateria(materia))}
              onLimparSimulados={() => dispatch(limparSimulados())}
              temSimulados={Object.keys(simulados).length > 0}
            />
            <View style={estilos.listaTitulo}>
              <Text style={estilos.tituloSecao}>Suas matérias</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={estilos.itemLista}>
            <CartaoMateria
              spec={spec}
              materia={item}
              termoSelecionado={termoSelecionado}
              meta={meta}
              simulados={simulados}
              onDefinirNota={(frenteId, componente, valor) =>
                digitarNota(item, frenteId, componente, valor)
              }
              onSimularMateria={() => simularMateria(item)}
              onRemover={() => dispatch(removerMateria(item.id))}
              onFocarCampo={aoFocarCampo}
            />
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity onPress={() => setSheetAberto(true)} style={estilos.botaoAdicionar}>
            <Text style={estilos.textoBotaoAdicionar}>+ Adicionar matéria</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={estilos.conteudo}
      />

      <AdicionarMateriaSheet
        visivel={sheetAberto}
        onFechar={() => setSheetAberto(false)}
        onAdicionar={(nome, cor: CorMateria, quantidadeFrentes) =>
          dispatch(adicionarMateria(nome, cor, quantidadeFrentes))
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingBottom: 32 },
  listaTitulo: { marginTop: 22, marginBottom: 10, marginHorizontal: 20 },
  tituloSecao: { fontWeight: "700", fontSize: 15, color: cores.texto },
  itemLista: { marginBottom: 0, marginHorizontal: 20 },
  botaoAdicionar: {
    marginTop: 14,
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: cores.rosaClaro,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 15,
    alignItems: "center",
  },
  textoBotaoAdicionar: { fontSize: 13.5, fontWeight: "700", color: cores.rosa },
});

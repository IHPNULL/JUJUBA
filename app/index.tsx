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
  definirMeta,
  definirNotaComponente,
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
import { CorMateria, cores } from "../src/presentation/shared/theme";

const spec = specReal as FormulaSpec;

function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

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

  useEffect(() => {
    dispatch(especificarFormulaAtiva(spec));
  }, [dispatch]);

  const mediaGeral = materias.length
    ? mediaEntreFrentes(materias.map((materia) => mediaDaMateria(materia, termoSelecionado)))
    : new Decimal(0);

  function simularFrente(materia: Materia, frenteId: string) {
    const frente = materia.frentes.find((f) => f.id === frenteId);
    if (!frente) return;
    const notas = frente.notas[termoSelecionado];
    const preenchidos: Record<string, Decimal | null> = {
      at: notas?.at ? paraDecimal(notas.at) : null,
      ao: notas?.ao ? paraDecimal(notas.ao) : null,
      saep: notas?.saep ? paraDecimal(notas.saep) : null,
      tarefa: notas?.tarefa ? paraDecimal(notas.tarefa) : null,
    };
    const resultado = resolverMinimosComponentes(spec, preenchidos, new Decimal(meta));
    if (resultado.tipo !== "valores" && resultado.tipo !== "jaAlcancado") return;
    Object.entries(resultado.valores).forEach(([componente, valor]) => {
      dispatch(
        definirNotaComponente({
          materiaId: materia.id,
          frenteId,
          componente: componente as keyof NotasFrente,
          valor: valor.toFixed(spec.escala.casasDecimais).replace(".", ","),
          simulado: true,
        })
      );
    });
  }

  function simularMateria(materia: Materia) {
    materia.frentes.forEach((frente) => simularFrente(materia, frente.id));
  }

  return (
    <SafeAreaView style={estilos.container} edges={["bottom"]}>
      <FlatList
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
              onMetaMenos={() => dispatch(definirMeta(meta - 0.5))}
              onMetaMais={() => dispatch(definirMeta(meta + 0.5))}
              onSimularTudo={() => materias.forEach(simularMateria)}
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
              onDefinirNota={(frenteId, componente, valor) =>
                dispatch(definirNotaComponente({ materiaId: item.id, frenteId, componente, valor }))
              }
              onSimularMateria={() => simularMateria(item)}
              onRemover={() => dispatch(removerMateria(item.id))}
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

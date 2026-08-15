import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { cores, CorMateria } from "../../shared/theme";

const esquemaNovaMateria = z.object({
  nome: z.string().trim().min(1, "Digite o nome da matéria"),
});

const CORES_DISPONIVEIS: CorMateria[] = ["pink", "gold", "plum"];

interface AdicionarMateriaSheetProps {
  visivel: boolean;
  onFechar: () => void;
  onAdicionar: (nome: string, cor: CorMateria, quantidadeFrentes: 1 | 2) => void;
}

export function AdicionarMateriaSheet({ visivel, onFechar, onAdicionar }: AdicionarMateriaSheetProps) {
  const insets = useSafeAreaInsets();
  const [quantidadeFrentes, setQuantidadeFrentes] = useState<1 | 2>(1);
  const [corSelecionada, setCorSelecionada] = useState<CorMateria>("pink");
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaNovaMateria), defaultValues: { nome: "" } });

  function fechar() {
    reset();
    setQuantidadeFrentes(1);
    setCorSelecionada("pink");
    onFechar();
  }

  function enviar(dados: { nome: string }) {
    onAdicionar(dados.nome, corSelecionada, quantidadeFrentes);
    fechar();
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      {/* A folha fica colada na base da tela, exatamente onde o teclado sobe.
          O `KeyboardAvoidingView` empurra a folha para cima pela altura do
          teclado — e, quando a própria janela já redimensiona (o
          `adjustResize` do Android), ele mede folga zero e não empurra nada,
          então não há empurrão em dobro. */}
      <KeyboardAvoidingView style={estilos.envolucro} behavior="padding">
        <TouchableOpacity style={estilos.fundo} activeOpacity={1} onPress={fechar} />
        <View style={[estilos.folha, { paddingBottom: 20 + insets.bottom }]}>
          <View style={estilos.puxador} />
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Nova matéria</Text>
            <TouchableOpacity onPress={fechar} style={estilos.botaoFechar}>
              <Text style={estilos.textoBotaoFechar}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.rotulo}>Nome da matéria</Text>
          <Controller
            control={control}
            name="nome"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Ex.: Biologia"
                style={estilos.entrada}
              />
            )}
          />
          {errors.nome && <Text style={estilos.erro}>{errors.nome.message}</Text>}

          <Text style={estilos.rotulo}>Frentes</Text>
          <View style={estilos.linhaChips}>
            {([1, 2] as const).map((quantidade) => {
              const selecionado = quantidade === quantidadeFrentes;
              return (
                <TouchableOpacity
                  key={quantidade}
                  onPress={() => setQuantidadeFrentes(quantidade)}
                  style={[
                    estilos.chip,
                    { backgroundColor: selecionado ? cores.rosa : cores.cartaoFundo },
                  ]}
                >
                  <Text style={[estilos.textoChip, { color: selecionado ? cores.branco : cores.textoSuave }]}>
                    {quantidade === 1 ? "Frente única" : "Duas frentes"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={estilos.rotulo}>Cor</Text>
          <View style={estilos.linhaCores}>
            {CORES_DISPONIVEIS.map((cor) => (
              <TouchableOpacity
                key={cor}
                onPress={() => setCorSelecionada(cor)}
                style={[
                  estilos.bolinhaCor,
                  {
                    backgroundColor: cores[corParaTom(cor)],
                    borderColor: cor === corSelecionada ? cores.texto : "transparent",
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleSubmit(enviar)} style={estilos.botaoAdicionar}>
            <Text style={estilos.textoBotaoAdicionar}>Adicionar matéria</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function corParaTom(cor: CorMateria): "rosa" | "dourado" | "roxo" {
  return cor === "pink" ? "rosa" : cor === "gold" ? "dourado" : "roxo";
}

const estilos = StyleSheet.create({
  envolucro: { flex: 1 },
  fundo: { flex: 1, backgroundColor: "rgba(58,36,24,0.45)" },
  folha: { backgroundColor: cores.branco, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingTop: 14 },
  puxador: { width: 36, height: 4, backgroundColor: cores.bordaCartao, borderRadius: 99, alignSelf: "center", marginBottom: 14 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titulo: { fontWeight: "700", fontSize: 18, color: cores.texto },
  botaoFechar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.cartaoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoFechar: { fontSize: 16, color: cores.textoSuave },
  rotulo: { fontSize: 12.5, fontWeight: "700", color: cores.textoSuave, marginTop: 18, marginBottom: 8 },
  entrada: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: cores.bordaCartao,
    paddingHorizontal: 16,
    fontSize: 15.5,
    fontWeight: "700",
    color: cores.texto,
  },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  linhaChips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14 },
  textoChip: { fontSize: 13, fontWeight: "700" },
  linhaCores: { flexDirection: "row", gap: 10 },
  bolinhaCor: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  botaoAdicionar: { marginTop: 22, backgroundColor: cores.rosa, padding: 15, borderRadius: 16, alignItems: "center" },
  textoBotaoAdicionar: { color: cores.branco, fontWeight: "700", fontSize: 15.5 },
});

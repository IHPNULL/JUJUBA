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
import { cores, CORES_MATERIA_PRESET, CorMateria } from "../../shared/theme";

const esquemaNovaMateria = z.object({
  nome: z.string().trim().min(1, "Digite o nome da matéria"),
});

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;

function ehHexValido(valor: string): boolean {
  return REGEX_HEX.test(valor);
}

interface AdicionarMateriaSheetProps {
  visivel: boolean;
  onFechar: () => void;
  onAdicionar: (nome: string, cor: CorMateria, quantidadeFrentes: 1 | 2) => void;
}

export function AdicionarMateriaSheet({ visivel, onFechar, onAdicionar }: AdicionarMateriaSheetProps) {
  const insets = useSafeAreaInsets();
  const [quantidadeFrentes, setQuantidadeFrentes] = useState<1 | 2>(1);
  const [corSelecionada, setCorSelecionada] = useState<CorMateria>(CORES_MATERIA_PRESET[0].hex);
  const [corPersonalizada, setCorPersonalizada] = useState(false);
  const [textoCorPersonalizada, setTextoCorPersonalizada] = useState("");
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaNovaMateria), defaultValues: { nome: "" } });

  const hexPersonalizadoValido = ehHexValido(textoCorPersonalizada);
  const corInvalidaParaEnviar = corPersonalizada && !hexPersonalizadoValido;

  function fechar() {
    reset();
    setQuantidadeFrentes(1);
    setCorSelecionada(CORES_MATERIA_PRESET[0].hex);
    setCorPersonalizada(false);
    setTextoCorPersonalizada("");
    onFechar();
  }

  function selecionarPreset(hex: CorMateria) {
    setCorPersonalizada(false);
    setCorSelecionada(hex);
  }

  function abrirCorPersonalizada() {
    setCorPersonalizada(true);
    if (hexPersonalizadoValido) setCorSelecionada(textoCorPersonalizada.toUpperCase());
  }

  function mudarHexPersonalizado(texto: string) {
    setTextoCorPersonalizada(texto);
    if (ehHexValido(texto)) setCorSelecionada(texto.toUpperCase());
  }

  function enviar(dados: { nome: string }) {
    if (corInvalidaParaEnviar) return;
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
            {CORES_MATERIA_PRESET.map(({ nome, hex }) => (
              <TouchableOpacity
                key={hex}
                testID={`cor-preset-${hex}`}
                onPress={() => selecionarPreset(hex)}
                accessibilityLabel={nome}
                style={[
                  estilos.bolinhaCor,
                  {
                    backgroundColor: hex,
                    borderColor: !corPersonalizada && hex === corSelecionada ? cores.texto : "transparent",
                  },
                ]}
              />
            ))}
            <TouchableOpacity
              testID="cor-personalizada-gatilho"
              onPress={abrirCorPersonalizada}
              accessibilityLabel="Cor personalizada"
              style={[
                estilos.bolinhaCor,
                estilos.bolinhaCorPersonalizada,
                { borderColor: corPersonalizada ? cores.texto : cores.bordaCartao },
              ]}
            >
              <Text style={estilos.textoBolinhaCorPersonalizada}>+</Text>
            </TouchableOpacity>
          </View>

          {corPersonalizada && (
            <View style={estilos.linhaCorPersonalizada}>
              <View style={[estilos.previaCorPersonalizada, { backgroundColor: corSelecionada }]} />
              <TextInput
                testID="cor-personalizada-campo"
                value={textoCorPersonalizada}
                onChangeText={mudarHexPersonalizado}
                placeholder="#RRGGBB"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                style={[estilos.entrada, estilos.entradaCorPersonalizada]}
              />
            </View>
          )}
          {corInvalidaParaEnviar && (
            <Text style={estilos.erro}>Cor inválida — use o formato #RRGGBB</Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit(enviar)}
            disabled={corInvalidaParaEnviar}
            style={[estilos.botaoAdicionar, corInvalidaParaEnviar && estilos.botaoAdicionarDesabilitado]}
          >
            <Text style={estilos.textoBotaoAdicionar}>Adicionar matéria</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
  linhaCores: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bolinhaCor: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  bolinhaCorPersonalizada: {
    backgroundColor: cores.cartaoFundo,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBolinhaCorPersonalizada: { fontSize: 18, fontWeight: "700", color: cores.textoSuave },
  linhaCorPersonalizada: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  previaCorPersonalizada: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: cores.bordaCartao },
  entradaCorPersonalizada: { flex: 1, height: 44 },
  botaoAdicionar: { marginTop: 22, backgroundColor: cores.rosa, padding: 15, borderRadius: 16, alignItems: "center" },
  botaoAdicionarDesabilitado: { opacity: 0.5 },
  textoBotaoAdicionar: { color: cores.branco, fontWeight: "700", fontSize: 15.5 },
});

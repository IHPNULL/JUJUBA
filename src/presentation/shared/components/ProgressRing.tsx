import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cores } from "../theme";

interface ProgressRingProps {
  /** 0 a 1 — fração preenchida do anel. Valores fora do intervalo são recortados. */
  progresso: number;
  rotulo: string;
  tamanho?: number;
}

export function ProgressRing({ progresso, rotulo, tamanho = 64 }: ProgressRingProps) {
  const raio = tamanho / 2 - 3.5;
  const circunferencia = 2 * Math.PI * raio;
  const fracao = Math.max(0, Math.min(1, progresso));
  const preenchido = fracao * circunferencia;

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Svg width={tamanho} height={tamanho} style={estilos.svg}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={raio} stroke={cores.douradoClaro} strokeWidth={7} fill="none" />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cores.dourado}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
        />
      </Svg>
      <View style={estilos.rotuloContainer}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  svg: { transform: [{ rotate: "-90deg" }] },
  rotuloContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rotulo: { fontWeight: "700", fontSize: 15, color: cores.texto },
});

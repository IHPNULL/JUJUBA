import Svg, { Path } from "react-native-svg";

interface IconeNovidadesProps {
  tamanho?: number;
  cor?: string;
}

/** Brilhos (Lucide `sparkles`), redesenhado aqui porque o projeto não tem
 *  biblioteca de ícones — só `react-native-svg`. */
export function IconeNovidades({ tamanho = 24, cor = "#FFFFFF" }: IconeNovidadesProps) {
  const tracos = {
    stroke: cor,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  } as const;

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <Path
        d="M11.02 3.36a1.05 1.05 0 0 1 1.96 0l1.6 4.16a1 1 0 0 0 .58.58l4.16 1.6a1.05 1.05 0 0 1 0 1.96l-4.16 1.6a1 1 0 0 0-.58.58l-1.6 4.16a1.05 1.05 0 0 1-1.96 0l-1.6-4.16a1 1 0 0 0-.58-.58l-4.16-1.6a1.05 1.05 0 0 1 0-1.96l4.16-1.6a1 1 0 0 0 .58-.58z"
        {...tracos}
      />
      <Path d="M19 3v4" {...tracos} />
      <Path d="M17 5h4" {...tracos} />
      <Path d="M5 17v3" {...tracos} />
      <Path d="M3.5 18.5h3" {...tracos} />
    </Svg>
  );
}

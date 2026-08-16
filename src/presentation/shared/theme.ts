/** Paleta fixa do mockup Jujuba.dc.html. */
export const cores = {
  fundo: "#FFF7EF",
  fundoTopo: "#F2EBE3",
  rosa: "#E31C79",
  rosaEscuro: "#B8115F",
  rosaClaro: "#FDE3EE",
  dourado: "#C9974B",
  douradoClaro: "#F6E9D1",
  roxo: "#8B5FBF",
  roxoClaro: "#EDE3F3",
  texto: "#3A2418",
  textoSuave: "#8A7468",
  textoFraco: "#B7A79A",
  branco: "#FFFFFF",
  cartaoFundo: "#F7F1EA",
  bordaCartao: "#F1E7DC",
  sucesso: "#2E9E5B",
  sucessoFundo: "#E7F5EC",
  erro: "#E2574C",
  erroFundo: "#FBE7E5",
} as const;

/** Cor da matéria: hex direto (`#RRGGBB`), de um preset ou digitado à mão. */
export type CorMateria = string;

/** Presets oferecidos no seletor de cor da matéria — não é a lista completa
 *  de cores possíveis, só o ponto de partida; o formulário aceita qualquer
 *  hex digitado à mão além destes. */
export const CORES_MATERIA_PRESET: { nome: string; hex: CorMateria }[] = [
  { nome: "Rosa", hex: "#E31C79" },
  { nome: "Dourado", hex: "#C9974B" },
  { nome: "Roxo", hex: "#8B5FBF" },
  { nome: "Azul", hex: "#3E7CB1" },
  { nome: "Verde", hex: "#2E9E5B" },
  { nome: "Laranja", hex: "#E0793C" },
  { nome: "Vermelho", hex: "#C64550" },
  { nome: "Turquesa", hex: "#2FA6A6" },
];

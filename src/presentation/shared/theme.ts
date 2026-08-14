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

export const paletaMateria = {
  pink: { fundo: cores.rosaClaro, cor: cores.rosa },
  gold: { fundo: cores.douradoClaro, cor: cores.dourado },
  plum: { fundo: cores.roxoClaro, cor: cores.roxo },
} as const;

export type CorMateria = keyof typeof paletaMateria;

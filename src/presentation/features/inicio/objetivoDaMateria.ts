import Decimal from "decimal.js";
import { calcularPontos, PontosDaMateria } from "../../../domain/objetivo/pontos";
import { resolverRecuperacao, ResultadoRecuperacao } from "../../../domain/objetivo/recuperacao";
import { chaveCampo, sugerirMinimos, ResultadoSugestao } from "../../../domain/objetivo/sugestao";
import { FrenteComNotas } from "../../../domain/objetivo/tipos";
import { FormulaSpec } from "../../../domain/formula/types";
import { Materia, TERMOS } from "../../store/inicioSlice";
import { entradasDoSolver } from "./simulacao";

/**
 * Adapta a matéria da store para o formato do domínio de objetivo anual.
 *
 * A regra de "o que conta como nota lançada" não é reimplementada aqui: usa
 * `entradasDoSolver`, a mesma fonte que a dica de meta do trimestre já usa.
 * Campo vazio e campo preenchido por simulação entram como `null` — ou seja,
 * simulação não vira ponto garantido, que seria a pior mentira possível
 * neste app.
 *
 * O índice do trimestre é a posição em `TERMOS`. Esses rótulos também são as
 * chaves de `notas` no dado gravado, então renomeá-los órfã as notas de quem
 * já usa o app (ver persistenciaInicio.test.ts).
 */
export function frentesParaDominio(
  materia: Materia,
  simulados: Record<string, boolean>
): FrenteComNotas[] {
  return materia.frentes.map((frente) => ({
    id: frente.id,
    notas: TERMOS.map((termo) => entradasDoSolver(materia, frente.id, termo, simulados)),
  }));
}

export interface ObjetivoDaMateria {
  pontos: PontosDaMateria;
  sugestao: ResultadoSugestao;
  recuperacao: ResultadoRecuperacao;
}

/**
 * Tudo o que a tela precisa saber sobre o objetivo anual desta matéria, numa
 * passada só: quanto já tem, quanto falta, o que tirar para fechar com o
 * menor esforço, e — se o trimestre selecionado ficou abaixo da meta — quanto
 * precisa na recuperação.
 */
export function calcularObjetivoDaMateria(
  spec: FormulaSpec,
  materia: Materia,
  termoSelecionado: string,
  meta: number,
  simulados: Record<string, boolean>
): ObjetivoDaMateria {
  const frentes = frentesParaDominio(materia, simulados);
  const trimestre = Math.max(0, TERMOS.indexOf(termoSelecionado));

  return {
    pontos: calcularPontos(spec, frentes),
    sugestao: sugerirMinimos(spec, frentes),
    recuperacao: resolverRecuperacao(spec, frentes, trimestre, new Decimal(meta)),
  };
}

/**
 * A sugestão pede a mesma FRAÇÃO do máximo em todo campo em aberto, então
 * dois campos do mesmo componente sempre recebem o mesmo valor. Isso deixa a
 * tela mostrar "AT 6,5 · Obj 6,5 · Tarefa 0,7" em vez de repetir a nota campo
 * a campo, trimestre a trimestre.
 */
export function sugestaoPorComponente(sugestao: ResultadoSugestao): Map<string, Decimal> {
  const porComponente = new Map<string, Decimal>();
  if (sugestao.tipo !== "sugestao") return porComponente;

  for (const campo of sugestao.campos) {
    const valor = sugestao.valores.get(chaveCampo(campo));
    if (!valor) continue;
    const atual = porComponente.get(campo.componente);
    // Se por algum motivo divergirem, mostra a exigência maior — nunca a
    // menor, que subestimaria o que o aluno precisa tirar.
    porComponente.set(campo.componente, atual ? Decimal.max(atual, valor) : valor);
  }
  return porComponente;
}

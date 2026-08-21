import Decimal from "decimal.js";
import { avaliarPeriodo, mediaEntreFrentes } from "../formula/motorDeCalculo";
import { FormulaSpec } from "../formula/types";
import { notaMaximaDe } from "./pontos";
import { FrenteComNotas } from "./tipos";

/**
 * "Não bati a meta neste trimestre — quanto preciso tirar na recuperação?"
 *
 * A regra da escola: a nota da recuperação **substitui uma nota daquele
 * trimestre**, e o aluno usa onde render mais. Então o app não escolhe por
 * intuição: para cada nota que a recuperação poderia substituir, calcula a
 * menor nota de recuperação que faria a matéria bater a meta, e devolve a
 * substituição que exige a MENOR nota. Menor nota exigida é a definição
 * operacional de "maior impacto positivo".
 *
 * Só entram como candidatas as notas na escala cheia (AT, Objetiva, SAEP).
 * Tarefa fica de fora: vale no máximo 1 ponto, é um bônus de entrega, e
 * "substituir a tarefa por uma nota de prova" não é uma operação que exista.
 *
 * A busca é uma varredura passo a passo na escala, não bisseção: com uma casa
 * decimal são 101 valores por candidata, o custo é irrelevante e o resultado
 * é exato — sem depender de a média ser monotônica na nota substituída.
 */
export type ResultadoRecuperacao =
  | { tipo: "metaAtingida"; media: Decimal }
  | { tipo: "semCandidatas" }
  | { tipo: "impossivel"; melhorMedia: Decimal }
  | {
      tipo: "precisa";
      /** Onde usar a recuperação para exigir a menor nota possível. */
      frenteId: string;
      componente: string;
      /** Nota que estava lá e seria substituída (0 se o campo está em aberto). */
      notaSubstituida: Decimal;
      /** Menor nota de recuperação que faz a matéria bater a meta. */
      notaNecessaria: Decimal;
      /** Média da matéria no trimestre depois da substituição. */
      mediaResultante: Decimal;
    };

interface Candidata {
  frenteId: string;
  componente: string;
  notaAtual: Decimal;
}

/** Média da matéria no trimestre, com uma nota opcionalmente substituída. */
function mediaDaMateria(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  trimestre: number,
  substituicao?: { frenteId: string; componente: string; nota: Decimal }
): Decimal {
  if (frentes.length === 0) return new Decimal(0);

  const medias = frentes.map((frente) => {
    const notas = frente.notas[trimestre] ?? {};
    const contexto: Record<string, Decimal> = {};
    for (const componente of spec.componentes) {
      const substituir =
        substituicao?.frenteId === frente.id && substituicao.componente === componente.id;
      contexto[componente.id] = substituir
        ? substituicao!.nota
        : (notas[componente.id] ?? new Decimal(0));
    }
    return avaliarPeriodo(spec, contexto);
  });

  return mediaEntreFrentes(medias);
}

/** Notas que a recuperação pode substituir: as que usam a escala cheia. */
function candidatas(spec: FormulaSpec, frentes: FrenteComNotas[], trimestre: number): Candidata[] {
  const lista: Candidata[] = [];
  for (const frente of frentes) {
    const notas = frente.notas[trimestre] ?? {};
    for (const componente of spec.componentes) {
      if (!notaMaximaDe(spec, componente.id).eq(spec.escala.max)) continue;
      lista.push({
        frenteId: frente.id,
        componente: componente.id,
        notaAtual: notas[componente.id] ?? new Decimal(0),
      });
    }
  }
  return lista;
}

export function resolverRecuperacao(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  trimestre: number,
  meta: Decimal
): ResultadoRecuperacao {
  const mediaAtual = mediaDaMateria(spec, frentes, trimestre);
  if (mediaAtual.gte(meta)) return { tipo: "metaAtingida", media: mediaAtual };

  const lista = candidatas(spec, frentes, trimestre);
  if (lista.length === 0) return { tipo: "semCandidatas" };

  const passo = new Decimal(10).pow(-spec.escala.casasDecimais);
  const maximo = new Decimal(spec.escala.max);

  let melhor: ResultadoRecuperacao & { tipo: "precisa" } | null = null;
  let melhorMediaPossivel = mediaAtual;

  for (const candidata of lista) {
    const mediaNoTeto = mediaDaMateria(spec, frentes, trimestre, {
      frenteId: candidata.frenteId,
      componente: candidata.componente,
      nota: maximo,
    });
    melhorMediaPossivel = Decimal.max(melhorMediaPossivel, mediaNoTeto);
    if (mediaNoTeto.lt(meta)) continue;

    // Menor nota, na escala, que faz esta substituição bater a meta.
    for (let nota = new Decimal(0); nota.lte(maximo); nota = nota.plus(passo)) {
      const media = mediaDaMateria(spec, frentes, trimestre, {
        frenteId: candidata.frenteId,
        componente: candidata.componente,
        nota,
      });
      if (media.lt(meta)) continue;

      if (!melhor || nota.lt(melhor.notaNecessaria)) {
        melhor = {
          tipo: "precisa",
          frenteId: candidata.frenteId,
          componente: candidata.componente,
          notaSubstituida: candidata.notaAtual,
          notaNecessaria: nota,
          mediaResultante: media,
        };
      }
      break;
    }
  }

  return melhor ?? { tipo: "impossivel", melhorMedia: melhorMediaPossivel };
}

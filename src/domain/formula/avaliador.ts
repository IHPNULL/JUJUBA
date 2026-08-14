import jsep from "jsep";
import Decimal from "decimal.js";
import { ContextoDeCalculo, FormulaError, ValorContexto } from "./types";
import { whitelist } from "./whitelist";

/**
 * Avalia uma expressão de FormulaSpec contra um contexto, sem `eval` e sem
 * acesso a nada fora da whitelist. Ver docs/MOTOR-DE-FORMULA.md §2-3.
 */
export function avaliarExpressao(expressao: string, contexto: ContextoDeCalculo): ValorContexto {
  const ast = jsep(expressao);
  return avaliarNo(ast, contexto);
}

function avaliarNo(no: jsep.Expression, contexto: ContextoDeCalculo): ValorContexto {
  switch (no.type) {
    case "Literal": {
      const lit = no as jsep.Literal;
      if (typeof lit.value === "number") return new Decimal(lit.value);
      if (typeof lit.value === "boolean") return lit.value;
      throw new FormulaError(`Literal não suportado: ${JSON.stringify(lit.value)}`);
    }
    case "Identifier": {
      const nome = (no as jsep.Identifier).name;
      if (nome === "nulo") return null;
      if (!(nome in contexto)) {
        throw new FormulaError(`Variável "${nome}" não existe no contexto`);
      }
      return contexto[nome];
    }
    case "UnaryExpression": {
      const un = no as jsep.UnaryExpression;
      const valor = avaliarNo(un.argument, contexto);
      if (un.operator === "-") return comoDecimal(valor).neg();
      if (un.operator === "!") return !comoBooleano(valor);
      throw new FormulaError(`Operador unário não suportado: ${un.operator}`);
    }
    case "BinaryExpression": {
      const bin = no as jsep.BinaryExpression;
      // jsep não distingue LogicalExpression de BinaryExpression: && e ||
      // chegam aqui com o mesmo tipo de nó. Curto-circuito tratado à parte.
      if (bin.operator === "&&") {
        return comoBooleano(avaliarNo(bin.left, contexto)) && comoBooleano(avaliarNo(bin.right, contexto));
      }
      if (bin.operator === "||") {
        return comoBooleano(avaliarNo(bin.left, contexto)) || comoBooleano(avaliarNo(bin.right, contexto));
      }
      return avaliarBinaria(bin.operator, avaliarNo(bin.left, contexto), avaliarNo(bin.right, contexto));
    }
    case "CallExpression": {
      const chamada = no as jsep.CallExpression;
      if (chamada.callee.type !== "Identifier") {
        throw new FormulaError("Só é permitido chamar funções da whitelist diretamente");
      }
      const nomeFuncao = (chamada.callee as jsep.Identifier).name;
      // `se` é tratado à parte: os ramos não usados nunca são avaliados.
      if (nomeFuncao === "se") {
        const [condNo, entaoNo, senaoNo] = chamada.arguments;
        const cond = comoBooleano(avaliarNo(condNo, contexto));
        return avaliarNo(cond ? entaoNo : senaoNo, contexto);
      }
      const fn = whitelist[nomeFuncao];
      if (!fn) throw new FormulaError(`Função "${nomeFuncao}" não está na whitelist`);
      const args = chamada.arguments.map((a) => avaliarNo(a, contexto));
      return fn(args);
    }
    case "ArrayExpression": {
      const arr = no as jsep.ArrayExpression;
      return arr.elements.filter((e): e is jsep.Expression => e !== null).map((e) => avaliarNo(e, contexto)) as unknown as ValorContexto;
    }
    default:
      throw new FormulaError(`Construção não suportada na FormulaSpec: ${no.type}`);
  }
}

function avaliarBinaria(operador: string, esquerda: ValorContexto, direita: ValorContexto): ValorContexto {
  if (operador === "==" || operador === "!=") {
    const iguais = igual(esquerda, direita);
    return operador === "==" ? iguais : !iguais;
  }
  const a = comoDecimal(esquerda);
  const b = comoDecimal(direita);
  switch (operador) {
    case "+":
      return a.plus(b);
    case "-":
      return a.minus(b);
    case "*":
      return a.times(b);
    case "/":
      if (b.isZero()) throw new FormulaError("Divisão por zero na FormulaSpec");
      return a.div(b);
    case "<":
      return a.lt(b);
    case "<=":
      return a.lte(b);
    case ">":
      return a.gt(b);
    case ">=":
      return a.gte(b);
    default:
      throw new FormulaError(`Operador não suportado: ${operador}`);
  }
}

function igual(a: ValorContexto, b: ValorContexto): boolean {
  if (a === null || b === null) return a === b;
  if (a instanceof Decimal && b instanceof Decimal) return a.eq(b);
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  return false;
}

function comoDecimal(v: ValorContexto): Decimal {
  if (v instanceof Decimal) return v;
  throw new FormulaError(`Esperava número, recebeu ${JSON.stringify(v)}`);
}

function comoBooleano(v: ValorContexto): boolean {
  if (typeof v === "boolean") return v;
  throw new FormulaError(`Esperava booleano, recebeu ${JSON.stringify(v)}`);
}

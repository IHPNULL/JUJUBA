# ADR 0005 — Objetivo anual de 24 pontos, com o 3º trimestre dobrado

**Status:** aceito (v1.8.0)

## Contexto

O aluno do Colégio Ser não acompanha o ano por média: acompanha por **pontos**.
A meta é somar 24 pontos até o fim do ano, e o último trimestre vale dobrado.

Isso não é uma regra nova de cálculo. `T1 + T2 + 2×T3 ≥ 24` em 4 unidades de
peso é exatamente média ponderada 6 — o mesmo corte de aprovação que a
`FormulaSpec` já declara. O que muda é a **forma de comunicar**: pontos que se
acumulam, não uma média que oscila.

## Decisões

### 1. O objetivo é por matéria

Cada matéria precisa dos seus 24 pontos; nota alta numa não compensa outra.
Matéria com mais de uma frente usa a média das frentes como nota do
trimestre, igual ao resto do app.

### 2. "Garantido" conta campo em aberto como zero

O número que a tela mostra como "você tem" nunca embute nota que o aluno
ainda não tirou. Campo vazio vale zero; nota preenchida por simulação também
não conta (usa a mesma noção de "preenchido" do solver de meta,
`entradasDoSolver`). Prometer ponto que depende de prova futura seria o pior
erro possível num app que o aluno usa para decidir se pode relaxar.

O teto — quanto daria tirando o máximo no que falta — é calculado à parte e
serve para dizer se o objetivo ainda é alcançável.

### 3. "Menor esforço" = mesma fração do máximo em cada campo em aberto

Definição, não intuição: pedir 60% de cada prova que falta minimiza a maior
nota individual exigida. Qualquer distribuição desigual alivia um campo à
custa de outro.

A regra já embute as duas assimetrias da fórmula sem tratá-las como caso
especial: Tarefa rende 1 ponto de média por ponto tirado (contra 0,5 da AT e
0,25 de Objetiva/SAEP), e o 3º trimestre vale dobrado. Campos que rendem mais
entram com coeficiente maior e puxam a fração exigida para baixo.

### 4. Recuperação: menor nota exigida = maior impacto

A nota da recuperação substitui **uma** nota do trimestre. Para cada
substituição possível, o app calcula a menor nota de recuperação que faria a
matéria bater a meta, e recomenda a que exige menos. "Maior impacto positivo"
vira, operacionalmente, "menor nota necessária".

A Tarefa não é candidata: vale no máximo 1 ponto, é bônus de entrega, e
substituí-la por nota de prova não é uma operação que exista.

A busca é varredura passo a passo na escala (101 valores por candidata com
uma casa decimal), não bisseção: o custo é irrelevante e o resultado não
depende de a média ser monotônica na nota substituída.

### 5. Nunca confiar na estimativa linear

O solver de sugestão sonda coeficientes e estima a fração necessária
linearmente, mas **confere contra o cálculo real** e sobe um passo de escala
por vez até bater os 24 — mesmo princípio já adotado em
`componentGoalSolver.ts`. A fórmula tem teto (`min(10, ...)`) e cada
avaliação já vem arredondada, então a estimativa orienta, o avaliador decide.

## Compatibilidade com dados já gravados

Nenhuma migração é necessária, e isso é uma consequência do desenho, não
sorte:

- O estado da tela Início é um único JSON numa tabela chave/valor
  (`rascunho`), não colunas — nada de schema para migrar.
- A feature **não acrescenta nenhum campo persistido**: tudo é derivado das
  notas que já existem.
- `hidratarPayloadInicio` continua exigindo só os três campos que a 1.7.1
  gravava. Campo novo obrigatório no validador jogaria fora o dado de quem
  atualiza — por isso a regra: campo novo, se vier, é opcional com default.
- Os rótulos de `TERMOS` ("1º Tri"...) são as **chaves** das notas gravadas.
  Renomear um rótulo órfã as notas daquele trimestre, então eles fazem parte
  do contrato de dados, não são texto de UI livre.
- O `android.package` não muda. Trocá-lo faria o Android tratar a
  atualização como outro app, e o banco do app antigo ficaria inacessível.

`persistenciaInicio.test.ts` guarda um payload no formato 1.7.1, escrito à
mão, e cobra que ele continue sendo lido inteiro.

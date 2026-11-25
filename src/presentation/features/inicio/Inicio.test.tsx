import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";
import Inicio from "../../../../app/index";
import specReducer from "../../store/specSlice";
import inicioReducer from "../../store/inicioSlice";
import { cores } from "../../shared/theme";

// SafeAreaView/SafeAreaProvider need measured frame/insets to render children
// in the test renderer — use the library's own jest mock, the same one its
// docs recommend for RNTL-based tests. `mockSafeAreaContext` (name must start
// with "mock" so babel-plugin-jest-hoist allows referencing it from inside
// the hoisted `jest.mock` factory below) is already the flattened default
// export, unlike a `require()` of the same path.
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);

type Tela = Awaited<ReturnType<typeof render>>;

/**
 * Campos de nota das frentes, na ordem do cartão: [AT, Objetiva, Tarefa] por
 * frente. A SAEP tem o mesmo placeholder, mas mora no cartão do topo (uma nota
 * só, para todas as matérias) — fica de fora para os índices não dependerem dela.
 */
function camposDasFrentes(tela: Tela) {
  return tela.getAllByPlaceholderText("0,0").filter((campo) => campo.props.testID !== "campo-saep");
}

/** Digita a SAEP do trimestre — a única que existe, compartilhada por todas as frentes. */
async function digitarSaep(tela: Tela, valor: string) {
  await fireEvent.changeText(tela.getByTestId("campo-saep"), valor);
}

function criarLojaDeTeste() {
  return configureStore({
    reducer: { spec: specReducer, inicio: inicioReducer },
  });
}

/**
 * Teste de integração da tela Início composta (app/index.tsx): renderiza o
 * componente de verdade sobre uma store Redux de verdade, adiciona uma
 * matéria pelo fluxo real da UI (folha "Nova matéria"), digita notas de
 * duas frentes cujas médias caem exatamente numa fronteira de
 * arredondamento (6,9 e 7,0 → média não-arredondada 6,95) e confere que o
 * texto exibido usa o MESMO valor arredondado (7,0) tanto para o número
 * quanto para o selo de aprovado/reprovado — o bug do Finding 1 comparava
 * o valor não-arredondado (6,95 < meta 7) contra um texto já arredondado
 * ("7,0"), fazendo o selo aparecer errado mesmo com o número certo.
 *
 * Este arquivo mora aqui (fora de `app/`) de propósito: o Expo Router trata
 * qualquer arquivo dentro de `app/` como candidato a rota e o inclui no
 * bundle de produção — um `app/index.test.tsx` fazia o `@testing-library/
 * react-native` (dependência só de teste) ser arrastado para o bundle real
 * do app, quebrando o build Android (`Unable to resolve module console`,
 * vindo de `@testing-library/react-native/dist/helpers/logger.js`, que o
 * Metro não consegue resolver fora de um ambiente Node). Testar `app/
 * index.tsx` a partir de fora do diretório `app/` evita isso.
 */
describe("Inicio (app/index.tsx) — fluxo composto", () => {
  it("adiciona uma matéria de duas frentes e exibe a média arredondada de forma consistente com o selo de meta", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Química");
    await fireEvent.press(tela.getByText("Duas frentes"));
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Química")).toBeTruthy());

    const camposNota = camposDasFrentes(tela);
    // 2 frentes × 3 componentes (AT, Objetiva, Tarefa), na ordem em que
    // CartaoMateria as renderiza: frente 1 primeiro, depois frente 2.
    expect(camposNota).toHaveLength(6);

    // SAEP: uma nota só, que entra nas duas frentes.
    await digitarSaep(tela, "7,0");

    // Frente 1 — mediaPeriodo = min(10, (at*2 + ao + saep) / 4 + tarefa)
    // = (6,8*2 + 7,0 + 7,0) / 4 + 0 = 6,9
    await fireEvent.changeText(camposNota[0], "6,8"); // AT
    await fireEvent.changeText(camposNota[1], "7,0"); // Objetiva
    await fireEvent.changeText(camposNota[2], "0"); // Tarefa

    // Frente 2 — mesma fórmula = (7,0*2 + 7,0 + 7,0) / 4 + 0 = 7,0
    await fireEvent.changeText(camposNota[3], "7,0"); // AT
    await fireEvent.changeText(camposNota[4], "7,0"); // Objetiva
    await fireEvent.changeText(camposNota[5], "0"); // Tarefa

    // mediaEntreFrentes([6,9, 7,0]) = 6,95 (exato, sem arredondar) — e a
    // escala da spec (1 casa, half_up) arredonda isso para 7,0.
    await waitFor(() => expect(tela.getAllByText("7,0").length).toBeGreaterThan(0));

    // Meta padrão é 7: o arredondado 7,0 alcança a meta (7,0 >= 7), então o
    // cartão precisa mostrar "Meta alcançada." — não a mensagem de "abaixo
    // da meta", que é o que a comparação não-arredondada (6,95 >= 7 = falso)
    // produziria antes da correção do Finding 1.
    expect(tela.getByText("Meta alcançada.")).toBeTruthy();
  });

  /**
   * Reproduz o bug relatado após o uso real do app instalado: os campos
   * preenchidos por "Simular" ficavam travados no valor antigo ao simular
   * de novo, porque o solver tratava qualquer campo não-vazio como
   * "digitado pelo usuário" — mesmo quando o próprio valor vinha de uma
   * simulação anterior. Aqui: digita SAEP e AT, simula (preenche AO/Tarefa),
   * corrige o AT digitado e simula de novo — os campos que a simulação
   * anterior preencheu precisam mudar de valor, não permanecer travados.
   */
  it("recalcula campos preenchidos por simulação anterior ao simular de novo", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    const camposIniciais = camposDasFrentes(tela);
    expect(camposIniciais).toHaveLength(3); // AT, Objetiva, Tarefa — frente única

    // AT e SAEP digitados pelo usuário; meta padrão é 7.
    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposIniciais[0], "5,0");
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));
    let campos = camposDasFrentes(tela);
    expect(campos[2].props.value).toBe("0,8"); // Tarefa

    // Usuário corrige o valor que ele mesmo digitou — os campos que a
    // simulação anterior preencheu (AO/Tarefa) precisam voltar a ser
    // tratados como reabertos na próxima simulação, não como "já
    // preenchidos" (o que faria o botão não atualizar nada, reproduzindo
    // o bug relatado).
    await fireEvent.changeText(campos[0], "8,0");
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("3,2"));
    campos = camposDasFrentes(tela);
    expect(campos[2].props.value).toBe("0,4"); // Tarefa
  });

  /**
   * O destaque rosa marca o que o USUÁRIO digitou, para separar visualmente
   * do que a simulação gerou. Simular preenche os campos vazios — e esses
   * campos preenchidos por simulação NÃO podem ganhar o destaque, senão
   * depois de simular a tela inteira fica rosa e o destaque perde a função.
   */
  it("destaca só os campos digitados pelo usuário, não os preenchidos por simulação", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    /** Se o campo está com o fundo/borda de "digitado pelo usuário". */
    function destacado(campo: { props: Record<string, any> }): boolean {
      const estilos = [campo.props.style].flat(Infinity) as ({ borderColor?: string } | null)[];
      return estilos.some((estilo) => estilo?.borderColor === cores.rosa);
    }

    // Só o AT é digitado na frente; os outros dois continuam vazios.
    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0");

    let campos = camposDasFrentes(tela);
    expect(campos.map(destacado)).toEqual([true, false, false]);

    // Simular preenche AO/Tarefa — valores gerados, sem destaque.
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    campos = camposDasFrentes(tela);
    expect(campos.every((campo) => campo.props.value.trim() !== "")).toBe(true);
    expect(campos.map(destacado)).toEqual([true, false, false]);
    // A SAEP foi digitada: tem o destaque, e a simulação não mexeu nela.
    expect(destacado(tela.getByTestId("campo-saep"))).toBe(true);
    expect(tela.getByTestId("campo-saep").props.value).toBe("7,5");
  });

  /**
   * "Simular" limpa antes de calcular: cada toque parte das notas digitadas,
   * nunca do resultado do toque anterior. Tocar duas vezes seguidas tem que
   * dar exatamente o mesmo resultado que tocar uma.
   */
  it("simular de novo parte das notas digitadas, sem acumular", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await fireEvent.press(tela.getByText("Simular mínimo p/ 7,0"));

    const campos = camposDasFrentes(tela);
    expect(campos[0].props.value).toBe("5,0"); // AT digitado
    expect(campos[1].props.value).toBe("7,5"); // Objetiva
    expect(campos[2].props.value).toBe("0,8"); // Tarefa
  });

  /**
   * Fecha o ciclo da limpeza: depois que uma meta inalcançável esvazia os
   * campos simulados, baixar a meta não os traz de volta sozinho (a frente
   * deixou de ter campo simulado) — mas "Simular" precisa reconstruir tudo.
   */
  it("volta a preencher ao simular depois de uma limpeza por meta inalcançável", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    for (const metaEsperada of ["7,5", "8,0", "8,5", "9,0"]) {
      await fireEvent.press(tela.getByText("+"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }
    expect(camposDasFrentes(tela)[1].props.value).toBe(""); // limpou

    for (const metaEsperada of ["8,5", "8,0", "7,5", "7,0"]) {
      await fireEvent.press(tela.getByText("−"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }
    // A frente ficou sem campo simulado, então baixar a meta não repreenche.
    expect(camposDasFrentes(tela)[1].props.value).toBe("");

    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));
    const campos = camposDasFrentes(tela);
    expect(campos[2].props.value).toBe("0,8"); // Tarefa
  });

  /**
   * Digitar numa nota já responde "e se eu tirar isto?" — os campos que a
   * simulação preencheu na mesma frente precisam acompanhar sem exigir um
   * toque no "Mínimo p/". Com SAEP = 7,5 e AT = 8,0, `have` = 23,5/4 =
   * 5,875 e o déficit para a meta 7,0 é 1,125 sobre uma capacidade de 3,5
   * (Objetiva 2,5 + Tarefa 1) → x ≈ 0,32 → Objetiva 3,2 / Tarefa 0,4.
   */
  it("recalcula os campos simulados ao digitar outra nota da mesma frente", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    // Corrige o AT — sem tocar em "Mínimo p/ 7,0" desta vez.
    await fireEvent.changeText(camposDasFrentes(tela)[0], "8,0");

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("3,2"));
    const campos = camposDasFrentes(tela);
    expect(campos[0].props.value).toBe("8,0"); // AT: exatamente o que foi digitado
    expect(campos[2].props.value).toBe("0,4"); // Tarefa
  });

  /**
   * Digitar por cima de um campo que a própria simulação tinha preenchido: o
   * valor digitado passa a valer como do usuário (não pode ser sobrescrito) e
   * os OUTROS simulados recalculam em torno dele.
   *
   * Com SAEP = 7,5, AT = 5,0 e Objetiva = 10 digitados, sobra só a Tarefa:
   * `have` = (10 + 10 + 7,5)/4 = 6,875, que `avaliarPeriodo` já arredonda
   * para 6,9 → falta 0,1 → Tarefa 0,1.
   */
  it("trata como digitado o campo que o usuário sobrescreve e recalcula os outros simulados", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    // Objetiva tinha sido preenchida pela simulação (7,5); o usuário digita 10.
    await fireEvent.changeText(camposDasFrentes(tela)[1], "10");

    await waitFor(() => expect(camposDasFrentes(tela)[2].props.value).toBe("0,1"));
    const campos = camposDasFrentes(tela);
    expect(campos[0].props.value).toBe("5,0"); // AT: digitado antes
    expect(campos[1].props.value).toBe("10"); // Objetiva: o que o usuário digitou, intocado
  });

  /**
   * A SAEP entra na média de todas as frentes: mudá-la recalcula os campos
   * simulados de qualquer matéria, sem tocar no "Mínimo p/". E a simulação
   * nunca escreve a SAEP — ela continua sendo o que o usuário digitou.
   * Com AT = 5,0: SAEP 7,5 → Objetiva 7,5 / Tarefa 0,8; SAEP 9,0 → 6,3 / 0,7.
   */
  it("recalcula as frentes simuladas quando a SAEP muda", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    await digitarSaep(tela, "9,0");

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("6,3"));
    expect(camposDasFrentes(tela)[2].props.value).toBe("0,7"); // Tarefa
    expect(tela.getByTestId("campo-saep").props.value).toBe("9,0");
  });

  /**
   * SAEP em aberto conta como 0 na simulação — ela nunca é preenchida, então
   * o solver não pode contar com ela. Com AT = 5,0 e sem SAEP, o máximo
   * possível é (10 + 10 + 0)/4 + 1 = 6,0: a meta 7 é inalcançável.
   */
  it("simula com a SAEP em aberto valendo 0, sem preenchê-la", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    expect(tela.getByText("Nem com nota máxima nas que faltam dá 7,0.")).toBeTruthy();
    expect(tela.getByTestId("campo-saep").props.value).toBe("");
    expect(camposDasFrentes(tela)[1].props.value).toBe("");
  });

  /** A SAEP é do trimestre: trocar de trimestre mostra a SAEP daquele trimestre. */
  it("guarda uma SAEP por trimestre", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await digitarSaep(tela, "8,0");
    expect(loja.getState().inicio.saep).toEqual({ "1º Tri": "8,0" });
    await fireEvent.press(tela.getByText("2º Tri"));
    expect(tela.getByTestId("campo-saep").props.value).toBe("");
    await fireEvent.press(tela.getByText("1º Tri"));
    expect(tela.getByTestId("campo-saep").props.value).toBe("8,0");
  });

  it("não simula nada ao digitar numa frente que não tem campo simulado", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "História");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("História")).toBeTruthy());

    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT

    await waitFor(() => expect(camposDasFrentes(tela)[0].props.value).toBe("5,0"));
    const campos = camposDasFrentes(tela);
    expect(campos[1].props.value).toBe(""); // Objetiva
    expect(campos[2].props.value).toBe(""); // Tarefa
  });

  /**
   * Apagar para redigitar passa por um estado vazio: recalcular ali encheria a
   * linha com base num valor que o usuário ainda está escrevendo. A linha
   * mantém os números da simulação anterior até vir um valor de verdade.
   */
  it("não recalcula enquanto o campo digitado está vazio", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    await fireEvent.changeText(camposDasFrentes(tela)[0], ""); // apaga o AT

    await waitFor(() => expect(camposDasFrentes(tela)[0].props.value).toBe(""));
    const campos = camposDasFrentes(tela);
    expect(campos[1].props.value).toBe("7,5"); // Objetiva: sem mexer
    expect(campos[2].props.value).toBe("0,8"); // Tarefa
  });

  /**
   * Os campos que a simulação preencheu são a resposta a "quanto falta para
   * bater a meta" — mudar a meta sem recalculá-los deixa na tela um plano
   * que responde à meta antiga.
   *
   * Contas (spec real, escala de 1 casa, arredondando o mínimo PARA CIMA):
   * com SAEP = 7,5 e AT = 5,0 digitados, `have` = (5×2 + 7,5)/4 = 4,375 e a
   * capacidade dos vazios é 0,25×10 (Obj) + 1×1 (Tarefa) = 3,5.
   *   meta 7,0 → déficit 2,625 → x = 0,75 → 7,5 / 0,8
   *   meta 7,5 → déficit 3,125 → x ≈ 0,89 → 8,9 / 0,9
   */
  it("recalcula os campos simulados quando a meta muda", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    // "+" do stepper de meta: 7,0 → 7,5. (O botão "+ Adicionar matéria" não
    // colide: `getByText` casa o texto inteiro, não um prefixo.)
    await fireEvent.press(tela.getByText("+"));

    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("8,9"));
    const campos = camposDasFrentes(tela);
    expect(campos[0].props.value).toBe("5,0"); // AT digitado: intocado
    expect(campos[2].props.value).toBe("0,9"); // Tarefa
    expect(tela.getByText("Mínimo p/ 7,5")).toBeTruthy();
  });

  it("não preenche campos de matéria que nunca foi simulada ao mudar a meta", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "História");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("História")).toBeTruthy());

    await fireEvent.press(tela.getByText("+"));

    await waitFor(() => expect(tela.getByText("Mínimo p/ 7,5")).toBeTruthy());
    camposDasFrentes(tela).forEach((campo) => {
      expect(campo.props.value).toBe("");
    });
  });

  /**
   * Subir a meta até um valor inalcançável não pode deixar na tela os números
   * da simulação anterior: eles diriam "faça isto e você bate a meta" para uma
   * meta que já não dá para bater. Com SAEP = 7,5 e AT = 5,0, o máximo
   * possível é 4,375 + 3,5 = 7,875, então a meta 9,0 é impossível.
   */
  it("limpa os campos simulados quando a nova meta se torna inalcançável", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Física");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Física")).toBeTruthy());

    await digitarSaep(tela, "7,5");
    await fireEvent.changeText(camposDasFrentes(tela)[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(camposDasFrentes(tela)[1].props.value).toBe("7,5"));

    // 7,0 → 9,0, de meio em meio ponto.
    for (const metaEsperada of ["7,5", "8,0", "8,5", "9,0"]) {
      await fireEvent.press(tela.getByText("+"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }

    const campos = camposDasFrentes(tela);
    expect(campos[0].props.value).toBe("5,0"); // AT digitado: continua lá
    expect(campos[1].props.value).toBe(""); // Objetiva
    expect(campos[2].props.value).toBe(""); // Tarefa
    expect(tela.getByText("Nem com nota máxima nas que faltam dá 9,0.")).toBeTruthy();
  });

  /**
   * A cor da matéria vem de um preset fixo (hex direto, sem indireção por
   * `paletaMateria`) — escolher um preset tem que refletir exatamente no
   * marcador do cartão.
   */
  it("usa a cor do preset escolhido no marcador da matéria", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Geografia");
    await fireEvent.press(tela.getByTestId("cor-preset-#3E7CB1")); // Azul
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Geografia")).toBeTruthy());
    expect(tela.getByTestId("marcador-cor-Geografia").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: "#3E7CB1" })])
    );
  });

  /**
   * O seletor de cor personalizada (reanimated-color-picker) só aparece
   * depois de tocar no gatilho "+" — e some de novo ao fechar a folha, sem
   * atrapalhar o fluxo normal de adicionar matéria (a cor arrasta um gesto
   * real no `Panel1`/`HueSlider`, que o ambiente de teste não simula; aqui
   * cobrimos que abrir o seletor não trava o resto do formulário).
   */
  it("abre o seletor de cor personalizada ao tocar no gatilho e permite adicionar a matéria normalmente", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    expect(tela.queryByTestId("cor-personalizada-picker")).toBeNull();

    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Artes");
    await fireEvent.press(tela.getByTestId("cor-personalizada-gatilho"));
    expect(tela.getByTestId("cor-personalizada-picker")).toBeTruthy();

    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Artes")).toBeTruthy());
  });

  /**
   * `notaMaxima` já vem da spec (AT/Objetiva/SAEP = 10, Tarefa = 1) — o
   * campo precisa recusar dígitos que estourariam esse teto, sem exigir
   * nenhum caso especial pro componente "tarefa" (ADR 0003: a fórmula é
   * dado, não código).
   */
  it("recusa dígitos que fariam a nota digitada passar do teto do componente", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "História");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("História")).toBeTruthy());

    const campos = camposDasFrentes(tela);

    // Tarefa (teto 1): "1" é aceito (= teto), "1,5" estoura e é recusado.
    await fireEvent.changeText(campos[2], "1");
    expect(campos[2].props.value).toBe("1");
    await fireEvent.changeText(campos[2], "1,5");
    expect(campos[2].props.value).toBe("1");

    // SAEP (teto 10), no cartão do topo: mesma regra.
    await digitarSaep(tela, "10");
    expect(tela.getByTestId("campo-saep").props.value).toBe("10");
    await digitarSaep(tela, "10,5");
    expect(tela.getByTestId("campo-saep").props.value).toBe("10");

    // AT (teto 10): "9" aceito, "99" estoura e é recusado.
    await fireEvent.changeText(campos[0], "9");
    expect(campos[0].props.value).toBe("9");
    await fireEvent.changeText(campos[0], "99");
    expect(campos[0].props.value).toBe("9");
  });

  /**
   * Terceira opção de frentes: matéria com 3 frentes independentes
   * (ex.: um curso dividido em três módulos), cada uma com seus 3 campos
   * de nota e o selo do cabeçalho refletindo a quantidade real.
   */
  it("adiciona uma matéria com três frentes", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Redação");
    await fireEvent.press(tela.getByText("Três frentes"));
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Redação")).toBeTruthy());

    expect(tela.getByText("3 frentes")).toBeTruthy();
    expect(tela.getByText("Frente 1")).toBeTruthy();
    expect(tela.getByText("Frente 2")).toBeTruthy();
    expect(tela.getByText("Frente 3")).toBeTruthy();
    expect(camposDasFrentes(tela)).toHaveLength(9); // 3 frentes × 3 componentes (a SAEP é uma só, no topo)
  });

  /** `normalizarNota` (simulacao.ts) tem os casos isolados — aqui só cobre
   *  que o campo de verdade aplica a normalização a cada tecla. */
  it("tira zero à esquerda e corta em 2 casas decimais ao digitar a nota", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Química");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    await waitFor(() => expect(tela.queryByText("Química")).toBeTruthy());

    const campos = camposDasFrentes(tela);
    await fireEvent.changeText(campos[0], "03,80"); // AT
    expect(campos[0].props.value).toBe("3,80");

    await fireEvent.changeText(campos[1], "9,999"); // Objetiva
    expect(campos[1].props.value).toBe("9,99");
  });
});

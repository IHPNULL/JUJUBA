import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";
import Inicio from "../../../../app/index";
import specReducer from "../../store/specSlice";
import inicioReducer from "../../store/inicioSlice";

// SafeAreaView/SafeAreaProvider need measured frame/insets to render children
// in the test renderer — use the library's own jest mock, the same one its
// docs recommend for RNTL-based tests. `mockSafeAreaContext` (name must start
// with "mock" so babel-plugin-jest-hoist allows referencing it from inside
// the hoisted `jest.mock` factory below) is already the flattened default
// export, unlike a `require()` of the same path.
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);

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

    const camposNota = tela.getAllByPlaceholderText("0,0");
    // 2 frentes × 4 componentes (AT, Objetiva, SAEP, Tarefa), na ordem em
    // que CartaoMateria as renderiza: frente 1 primeiro, depois frente 2.
    expect(camposNota).toHaveLength(8);

    // Frente 1 — mediaPeriodo = min(10, (at*2 + ao + saep) / 4 + tarefa)
    // = (6,9*2 + 6,9 + 6,9) / 4 + 0 = 6,9
    await fireEvent.changeText(camposNota[0], "6,9"); // AT
    await fireEvent.changeText(camposNota[1], "6,9"); // Objetiva
    await fireEvent.changeText(camposNota[2], "6,9"); // SAEP
    await fireEvent.changeText(camposNota[3], "0"); // Tarefa

    // Frente 2 — mesma fórmula = (7,0*2 + 7,0 + 7,0) / 4 + 0 = 7,0
    await fireEvent.changeText(camposNota[4], "7,0"); // AT
    await fireEvent.changeText(camposNota[5], "7,0"); // Objetiva
    await fireEvent.changeText(camposNota[6], "7,0"); // SAEP
    await fireEvent.changeText(camposNota[7], "0"); // Tarefa

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
   * simulação anterior. Aqui: digita AT, simula (preenche AO/SAEP/Tarefa),
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

    const camposIniciais = tela.getAllByPlaceholderText("0,0");
    expect(camposIniciais).toHaveLength(4); // AT, Objetiva, SAEP, Tarefa — frente única

    // Só o AT é digitado pelo usuário; meta padrão é 7.
    await fireEvent.changeText(camposIniciais[0], "5,0");
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));
    let campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[2].props.value).toBe("7,5"); // SAEP
    expect(campos[3].props.value).toBe("0,8"); // Tarefa

    // Usuário corrige o valor que ele mesmo digitou — os campos que a
    // simulação anterior preencheu (AO/SAEP/Tarefa) precisam voltar a ser
    // tratados como reabertos na próxima simulação, não como "já
    // preenchidos" (o que faria o botão não atualizar nada, reproduzindo
    // o bug relatado).
    await fireEvent.changeText(campos[0], "8,0");
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("5,0"));
    campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[2].props.value).toBe("5,0"); // SAEP
    expect(campos[3].props.value).toBe("0,5"); // Tarefa
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await fireEvent.press(tela.getByText("Simular mínimo p/ 7,0"));

    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[0].props.value).toBe("5,0"); // AT digitado
    expect(campos[1].props.value).toBe("7,5"); // Objetiva
    expect(campos[2].props.value).toBe("7,5"); // SAEP
    expect(campos[3].props.value).toBe("0,8"); // Tarefa
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    for (const metaEsperada of ["7,5", "8,0", "8,5", "9,0"]) {
      await fireEvent.press(tela.getByText("+"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }
    expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe(""); // limpou

    for (const metaEsperada of ["8,5", "8,0", "7,5", "7,0"]) {
      await fireEvent.press(tela.getByText("−"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }
    // A frente ficou sem campo simulado, então baixar a meta não repreenche.
    expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("");

    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[2].props.value).toBe("7,5"); // SAEP
    expect(campos[3].props.value).toBe("0,8"); // Tarefa
  });

  /**
   * Digitar numa nota já responde "e se eu tirar isto?" — os campos que a
   * simulação preencheu na mesma frente precisam acompanhar sem exigir um
   * toque no "Mínimo p/". Com AT = 8,0, `have` = 16/4 = 4,0 e o déficit para
   * a meta 7,0 é 3,0 sobre uma capacidade de 6,0 → x = 0,5 → 5,0 / 5,0 / 0,5.
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    // Corrige o AT — sem tocar em "Mínimo p/ 7,0" desta vez.
    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "8,0");

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("5,0"));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[0].props.value).toBe("8,0"); // AT: exatamente o que foi digitado
    expect(campos[2].props.value).toBe("5,0"); // SAEP
    expect(campos[3].props.value).toBe("0,5"); // Tarefa
  });

  /**
   * Digitar por cima de um campo que a própria simulação tinha preenchido: o
   * valor digitado passa a valer como do usuário (não pode ser sobrescrito) e
   * os OUTROS simulados recalculam em torno dele.
   *
   * Com AT = 5,0 e SAEP = 9,0 digitados, sobram Objetiva e Tarefa. Como
   * `avaliarPeriodo` arredonda em cada sondagem (escala de 1 casa):
   * `have` = (10+0+9)/4 = 4,75 → 4,8; com Objetiva no máximo (10+10+9)/4 =
   * 7,25 → 7,3, logo coef 0,25; com Tarefa no máximo 5,75 → 5,8, coef 1,0.
   * Capacidade = 3,5 e déficit = 2,2 → x = 0,62857… → Objetiva 6,3 (teto de
   * uma casa) e Tarefa 0,7.
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[2].props.value).toBe("7,5"));

    // SAEP tinha sido preenchido pela simulação (7,5); o usuário digita 9,0.
    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[2], "9,0");

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("6,3"));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[0].props.value).toBe("5,0"); // AT: digitado antes
    expect(campos[2].props.value).toBe("9,0"); // SAEP: o que o usuário digitou, intocado
    expect(campos[3].props.value).toBe("0,7"); // Tarefa
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[0].props.value).toBe("5,0"));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[1].props.value).toBe(""); // Objetiva
    expect(campos[2].props.value).toBe(""); // SAEP
    expect(campos[3].props.value).toBe(""); // Tarefa
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], ""); // apaga o AT

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[0].props.value).toBe(""));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[1].props.value).toBe("7,5"); // Objetiva: sem mexer
    expect(campos[2].props.value).toBe("7,5"); // SAEP
    expect(campos[3].props.value).toBe("0,8"); // Tarefa
  });

  /**
   * Os campos que a simulação preencheu são a resposta a "quanto falta para
   * bater a meta" — mudar a meta sem recalculá-los deixa na tela um plano
   * que responde à meta antiga.
   *
   * Contas (spec real, escala de 1 casa, arredondando o mínimo PARA CIMA):
   * com AT = 5,0 digitado, `have` = (5×2)/4 = 2,5 e a capacidade dos vazios
   * é 0,25×10 (Obj) + 0,25×10 (SAEP) + 1×1 (Tarefa) = 6,0.
   *   meta 7,0 → déficit 4,5 → x = 0,75 → 7,5 / 7,5 / 0,8
   *   meta 7,5 → déficit 5,0 → x = 0,8333… → 8,4 / 8,4 / 0,9
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    // "+" do stepper de meta: 7,0 → 7,5. (O botão "+ Adicionar matéria" não
    // colide: `getByText` casa o texto inteiro, não um prefixo.)
    await fireEvent.press(tela.getByText("+"));

    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("8,4"));
    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[0].props.value).toBe("5,0"); // AT digitado: intocado
    expect(campos[2].props.value).toBe("8,4"); // SAEP
    expect(campos[3].props.value).toBe("0,9"); // Tarefa
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
    tela.getAllByPlaceholderText("0,0").forEach((campo) => {
      expect(campo.props.value).toBe("");
    });
  });

  /**
   * Subir a meta até um valor inalcançável não pode deixar na tela os números
   * da simulação anterior: eles diriam "faça isto e você bate a meta" para uma
   * meta que já não dá para bater. Com AT = 5,0 a capacidade dos vazios é 6,0,
   * então a meta 9,0 (déficit 6,5) é impossível.
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

    await fireEvent.changeText(tela.getAllByPlaceholderText("0,0")[0], "5,0"); // AT
    await fireEvent.press(tela.getByText("Mínimo p/ 7,0"));
    await waitFor(() => expect(tela.getAllByPlaceholderText("0,0")[1].props.value).toBe("7,5"));

    // 7,0 → 9,0, de meio em meio ponto.
    for (const metaEsperada of ["7,5", "8,0", "8,5", "9,0"]) {
      await fireEvent.press(tela.getByText("+"));
      await waitFor(() => expect(tela.getByText(`Mínimo p/ ${metaEsperada}`)).toBeTruthy());
    }

    const campos = tela.getAllByPlaceholderText("0,0");
    expect(campos[0].props.value).toBe("5,0"); // AT digitado: continua lá
    expect(campos[1].props.value).toBe(""); // Objetiva
    expect(campos[2].props.value).toBe(""); // SAEP
    expect(campos[3].props.value).toBe(""); // Tarefa
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
   * Cor personalizada aceita qualquer hex, mas só depois de validado — um
   * hex incompleto ou mal formado não pode virar uma matéria com cor
   * quebrada. Corrigir o texto pro formato certo libera o envio.
   */
  it("bloqueia o envio com hex personalizado inválido e libera quando fica válido", async () => {
    const loja = criarLojaDeTeste();
    const tela = await render(
      <Provider store={loja}>
        <Inicio />
      </Provider>
    );

    await fireEvent.press(tela.getByText("+ Adicionar matéria"));
    await fireEvent.changeText(tela.getByPlaceholderText("Ex.: Biologia"), "Artes");
    await fireEvent.press(tela.getByTestId("cor-personalizada-gatilho"));

    await fireEvent.changeText(tela.getByTestId("cor-personalizada-campo"), "xyz");
    await fireEvent.press(tela.getByText("Adicionar matéria"));
    expect(tela.queryByText("Artes")).toBeNull();

    await fireEvent.changeText(tela.getByTestId("cor-personalizada-campo"), "#123ABC");
    await fireEvent.press(tela.getByText("Adicionar matéria"));

    await waitFor(() => expect(tela.queryByText("Artes")).toBeTruthy());
    expect(tela.getByTestId("marcador-cor-Artes").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: "#123ABC" })])
    );
  });
});

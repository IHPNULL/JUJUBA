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
});

import { useCallback, useEffect, useRef } from "react";
import { FlatList, Keyboard, TextInput } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Folga entre a base do campo em foco e o topo do teclado. */
const MARGEM_PADRAO = 24;

/**
 * Mantém o campo em foco visível quando o teclado abre.
 *
 * O React Native NÃO rola sozinho até o campo focado: o `ScrollView` até tem
 * a maquinaria (`scrollResponderScrollNativeHandleToKeyboard`), mas nada liga
 * o foco do `TextInput` a ela. No Android o `adjustResize` do manifesto
 * encolhe a janela quando o teclado sobe — o campo simplesmente fica fora da
 * área visível, sem rolagem nenhuma.
 *
 * Estratégia: guardar o campo que recebeu foco, medir sua posição na janela
 * quando o teclado termina de aparecer (já com a janela redimensionada) e
 * rolar a lista exatamente pelo tanto que ele invade o teclado. Medir depois
 * do `keyboardDidShow`, e não no `onFocus`, é o que garante que a medição já
 * reflita o novo tamanho da janela.
 */
export function useCampoVisivelComTeclado<T>(margem: number = MARGEM_PADRAO) {
  const referenciaDaLista = useRef<FlatList<T>>(null);
  const deslocamentoAtual = useRef(0);
  const campoFocado = useRef<TextInput | null>(null);

  const rolarAteOCampo = useCallback(
    (topoDoTeclado: number) => {
      const campo = campoFocado.current;
      if (!campo) return;
      campo.measureInWindow((_x, y, _largura, altura) => {
        const invasao = y + altura + margem - topoDoTeclado;
        if (invasao <= 0) return;
        referenciaDaLista.current?.scrollToOffset({
          offset: Math.max(0, deslocamentoAtual.current + invasao),
          animated: true,
        });
      });
    },
    [margem]
  );

  useEffect(() => {
    const aoAbrir = Keyboard.addListener("keyboardDidShow", (evento) =>
      rolarAteOCampo(evento.endCoordinates.screenY)
    );
    const aoFechar = Keyboard.addListener("keyboardDidHide", () => {
      campoFocado.current = null;
    });
    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, [rolarAteOCampo]);

  /** Passe no `onFocus` de cada campo, com a referência do próprio `TextInput`. */
  const aoFocarCampo = useCallback(
    (campo: TextInput | null) => {
      campoFocado.current = campo;
      // Pulando de um campo para outro o teclado já está aberto e o
      // `keyboardDidShow` não dispara de novo — usa as métricas atuais.
      const metricas = Keyboard.isVisible() ? Keyboard.metrics() : undefined;
      if (metricas) rolarAteOCampo(metricas.screenY);
    },
    [rolarAteOCampo]
  );

  /** Passe no `onScroll` da lista — o deslocamento atual é a base da conta. */
  const aoRolar = useCallback((evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    deslocamentoAtual.current = evento.nativeEvent.contentOffset.y;
  }, []);

  return { referenciaDaLista, aoFocarCampo, aoRolar };
}

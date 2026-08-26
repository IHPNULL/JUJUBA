import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type { RascunhoRepository } from "../../../domain/repositories/rascunhoRepository";
import {
  CHAVE_RASCUNHO_NOVIDADES,
  lerVersaoVista,
  novidadeParaMostrar,
  serializarVersaoVista,
  type Novidade,
} from "../novidades";

/**
 * Decide se o modal "O que há de novo" abre nesta sessão.
 *
 * Reaproveita o `RascunhoRepository` (o mesmo que guarda a tela Início) em
 * vez de um armazenamento próprio: ele já é a chave-valor do app e já tem
 * implementação para os dois mundos — SQLite no celular, `localStorage` na
 * web (ver `app/_layout.tsx`). Por isso o repositório e o `prontoBanco` são
 * injetados pelo chamador, como em `usePersistenciaInicio`.
 *
 * A leitura acontece uma vez, na montagem. Enquanto ela não termina,
 * `novidade` é `null` e nada aparece — o modal surge um instante depois, em
 * vez de piscar na tela de quem já viu.
 *
 * Na web nunca abre sozinho: lá não existe "instalar" nem "atualizar", a
 * página já entrega sempre a última versão, e um modal na cara de quem só
 * abriu o site é interrupção sem motivo. O texto continua acessível pelo
 * ícone de novidades no topo da tela (`HeaderInicio`).
 */
export function useNovidades(repositorio: RascunhoRepository, prontoBanco: Promise<void>) {
  const [novidade, setNovidade] = useState<Novidade | null>(null);
  const versaoAtual = Constants.expoConfig?.version;

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelado = false;
    (async () => {
      await prontoBanco;
      const salvo = await repositorio.obterPorChave(CHAVE_RASCUNHO_NOVIDADES);
      if (cancelado) return;
      const versaoVista = salvo ? lerVersaoVista(salvo.payloadJson) : null;
      setNovidade(novidadeParaMostrar(versaoAtual, versaoVista));
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fecha o modal e marca a versão como vista. Some da tela na hora, sem
   * esperar a gravação: se ela falhar, o pior que acontece é o modal voltar
   * na próxima abertura — nada que justifique segurar o toque do usuário.
   */
  const fechar = useCallback(() => {
    setNovidade(null);
    if (!versaoAtual) return;
    void repositorio
      .salvar({
        chave: CHAVE_RASCUNHO_NOVIDADES,
        payloadJson: serializarVersaoVista(versaoAtual),
        atualizadoEm: new Date().toISOString(),
      })
      .catch(() => {});
  }, [repositorio, versaoAtual]);

  return { novidade, fechar };
}

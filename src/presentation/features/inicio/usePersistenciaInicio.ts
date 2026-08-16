import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useStore } from "react-redux";
import type { RascunhoRepository } from "../../../domain/repositories/rascunhoRepository";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { hidratar } from "../../store/inicioSlice";
import {
  CHAVE_RASCUNHO_INICIO,
  hidratarPayloadInicio,
  serializarEstadoInicio,
  type InicioState,
} from "./persistenciaInicio";

const DEBOUNCE_MS = 300;

/**
 * Write-through com debounce para a tela Início (docs/ARQUITETURA.md §6,
 * Opção A do design de persistência): guarda `{ termoSelecionado, meta,
 * materias }` inteiro como um rascunho — nunca `simulados`, que é sempre
 * sessão nova.
 *
 * `repositorio` e `prontoBanco` são sempre injetados pelo chamador (nunca um
 * singleton importado aqui), pelo mesmo motivo dos repositórios em
 * `src/data/repositories`: permite testar com `createTestDatabase()` sem
 * tocar no driver real do `expo-sqlite`.
 */
export function usePersistenciaInicio(repositorio: RascunhoRepository, prontoBanco: Promise<void>) {
  const dispatch = useAppDispatch();
  const estado = useAppSelector((state) => state.inicio);
  const store = useStore<{ inicio: InicioState }>();
  const prontoRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pronto, setPronto] = useState(false);

  // Lê o estado direto da store (não do `estado` do render) na hora de
  // salvar: a store do Redux é sempre a fonte canônica e está em dia assim
  // que um `dispatch` retorna, sem depender do React já ter comitado o
  // próximo render — importante para o flush de AppState, que pode disparar
  // no mesmo instante de uma mudança de estado.
  const salvarAgora = useCallback(() => {
    return repositorio.salvar({
      chave: CHAVE_RASCUNHO_INICIO,
      payloadJson: serializarEstadoInicio(store.getState().inicio),
      atualizadoEm: new Date().toISOString(),
    });
  }, [repositorio, store]);

  // Hidrata uma única vez, na montagem.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      await prontoBanco;
      const salvo = await repositorio.obterPorChave(CHAVE_RASCUNHO_INICIO);
      if (cancelado) return;
      const payload = salvo ? hidratarPayloadInicio(salvo.payloadJson) : null;
      if (payload) dispatch(hidratar(payload));
      prontoRef.current = true;
      setPronto(true);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva com debounce a cada mudança de estado, uma vez pronto.
  useEffect(() => {
    if (!prontoRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void salvarAgora();
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [estado, salvarAgora]);

  // iOS: background/inactive é o último momento garantido antes do SO encerrar o app.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        void salvarAgora();
      }
    });
    return () => subscription.remove();
  }, [salvarAgora]);

  return { pronto };
}

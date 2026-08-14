import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setStatus, setError } from '../store/updatesSlice';

const THROTTLE_MS = 60 * 60 * 1000; // 1 hora

/**
 * Gerencia o ciclo de vida de atualizações OTA (expo-updates): checa no cold
 * launch e em toda transição do AppState para "active", com throttle de 1h
 * entre checagens. Qualquer falha de checagem/download volta silenciosamente
 * para "idle" (ver docs/superpowers/specs/2026-08-13-ota-updates-design.md,
 * §Tratamento de erro) — não há UI de erro.
 *
 * Importante: este hook nunca chama `Updates.reloadAsync()` sozinho. Ele só
 * expõe `reloadApp`, que o consumidor (um botão de UI, em outra tarefa) deve
 * invocar explicitamente. O app não deve nunca recarregar sem ação do
 * usuário.
 */
export function useAppUpdates() {
  const dispatch = useAppDispatch();
  const { status, lastCheckTimestamp } = useAppSelector((state) => state.updates);

  // `checkForUpdates` é criado uma única vez (via useCallback com deps
  // estáveis) e registrado no listener de AppState dentro de um efeito que
  // roda só na montagem. Sem essas refs, o listener e a checagem de cold
  // launch fechariam sobre os valores de `status`/`lastCheckTimestamp` do
  // momento da montagem para sempre, e o guard de idle e o throttle de 1h
  // nunca veriam o estado real do Redux em checagens futuras. As refs são
  // mantidas em dia pelo efeito abaixo e também atualizadas manualmente logo
  // após o dispatch que inicia uma checagem, para fechar a janela entre o
  // dispatch (síncrono na store) e o re-render que propagaria o novo valor
  // via useSelector.
  const statusRef = useRef(status);
  const lastCheckTimestampRef = useRef(lastCheckTimestamp);

  useEffect(() => {
    statusRef.current = status;
    lastCheckTimestampRef.current = lastCheckTimestamp;
  }, [status, lastCheckTimestamp]);

  const checkForUpdates = useCallback(async () => {
    if (statusRef.current !== 'idle') return;

    const now = Date.now();
    const last = lastCheckTimestampRef.current;
    if (last !== null && now - last < THROTTLE_MS) return;

    statusRef.current = 'checking';
    lastCheckTimestampRef.current = now;

    try {
      dispatch(setStatus('checking'));
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        dispatch(setStatus('disponivel'));
        dispatch(setStatus('baixando'));
        await Updates.fetchUpdateAsync();
        dispatch(setStatus('pronta'));
        statusRef.current = 'pronta';
      } else {
        dispatch(setStatus('idle'));
        statusRef.current = 'idle';
      }
    } catch (e) {
      dispatch(setError(e instanceof Error ? e.message : 'Unknown error'));
      dispatch(setStatus('idle'));
      statusRef.current = 'idle';
    }
  }, [dispatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void checkForUpdates();
      }
    });

    void checkForUpdates(); // Checagem no cold launch

    return () => subscription.remove();
  }, [checkForUpdates]);

  const reloadApp = useCallback(async () => {
    if (statusRef.current === 'pronta') {
      await Updates.reloadAsync();
    }
  }, []);

  return { status, reloadApp };
}

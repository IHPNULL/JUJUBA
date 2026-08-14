import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';
import { useAppUpdates } from './useAppUpdates';
import updatesReducer from '../store/updatesSlice';

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const mockedCheckForUpdateAsync = Updates.checkForUpdateAsync as jest.Mock;
const mockedFetchUpdateAsync = Updates.fetchUpdateAsync as jest.Mock;
const mockedAddEventListener = jest.spyOn(AppState, 'addEventListener');

function createTestStore() {
  return configureStore({
    reducer: { updates: updatesReducer },
  });
}

type TestStore = ReturnType<typeof createTestStore>;

// react-redux types `children` as a required prop on Provider, which trips up
// React.createElement's overload resolution when children are instead passed
// as the rest argument (they still reach Provider correctly at runtime). This
// widened type only relaxes that at the type level for this test helper.
const ReduxProvider = Provider as unknown as React.ComponentType<{
  store: TestStore;
  children?: React.ReactNode;
}>;

function renderUseAppUpdates(store: TestStore) {
  return renderHook(() => useAppUpdates(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(ReduxProvider, { store }, children),
  });
}

/** Returns the handler the hook registered for AppState's "change" event. */
function getAppStateChangeHandler(): (state: AppStateStatus) => void {
  const call = mockedAddEventListener.mock.calls.find(([event]) => event === 'change');
  if (!call) {
    throw new Error('AppState.addEventListener("change", ...) was not registered');
  }
  return call[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAddEventListener.mockImplementation(() => ({ remove: jest.fn() }));
});

describe('useAppUpdates', () => {
  it('goes idle -> checking -> disponivel -> baixando -> pronta on a successful check+fetch', async () => {
    mockedCheckForUpdateAsync.mockResolvedValue({ isAvailable: true } as unknown as Updates.UpdateCheckResult);
    mockedFetchUpdateAsync.mockResolvedValue({ isNew: true } as unknown as Updates.UpdateFetchResult);

    const store = createTestStore();
    const { result } = await renderUseAppUpdates(store);

    await waitFor(() => expect(result.current.status).toBe('pronta'));

    expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockedFetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(store.getState().updates.error).toBeNull();
  });

  it('goes checking -> idle with error set when the check fails', async () => {
    mockedCheckForUpdateAsync.mockRejectedValue(new Error('network down'));

    const store = createTestStore();
    const { result } = await renderUseAppUpdates(store);

    await waitFor(() => expect(store.getState().updates.error).toBe('network down'));

    expect(result.current.status).toBe('idle');
    expect(mockedFetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('goes checking -> idle with error set when the fetch fails', async () => {
    mockedCheckForUpdateAsync.mockResolvedValue({ isAvailable: true } as unknown as Updates.UpdateCheckResult);
    mockedFetchUpdateAsync.mockRejectedValue(new Error('download failed'));

    const store = createTestStore();
    const { result } = await renderUseAppUpdates(store);

    await waitFor(() => expect(store.getState().updates.error).toBe('download failed'));

    expect(result.current.status).toBe('idle');
  });

  it('does not re-check on a foreground event within the 1h throttle window', async () => {
    mockedCheckForUpdateAsync.mockResolvedValue({ isAvailable: false } as unknown as Updates.UpdateCheckResult);

    const store = createTestStore();
    const { result } = await renderUseAppUpdates(store);

    await waitFor(() => expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.status).toBe('idle'));

    const handleChange = getAppStateChangeHandler();
    await act(async () => {
      handleChange('active');
    });

    expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('re-checks on a foreground event once the 1h throttle window has passed', async () => {
    mockedCheckForUpdateAsync.mockResolvedValue({ isAvailable: false } as unknown as Updates.UpdateCheckResult);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const store = createTestStore();
    await renderUseAppUpdates(store);

    await waitFor(() => expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1));

    nowSpy.mockReturnValue(1_000_000 + 60 * 60 * 1000 + 1);

    const handleChange = getAppStateChangeHandler();
    await act(async () => {
      handleChange('active');
    });

    await waitFor(() => expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(2));

    nowSpy.mockRestore();
  });

  it('ignores foreground events while a check is not idle (e.g. re-entrant calls)', async () => {
    let resolveCheck: (value: unknown) => void = () => {};
    mockedCheckForUpdateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
    );

    const store = createTestStore();
    await renderUseAppUpdates(store);

    await waitFor(() => expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(store.getState().updates.status).toBe('checking'));

    const handleChange = getAppStateChangeHandler();
    await act(async () => {
      handleChange('active');
    });

    // Still mid-flight ("checking"), so the foreground event must not have
    // started a second check.
    expect(mockedCheckForUpdateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCheck({ isAvailable: false });
    });
  });
});

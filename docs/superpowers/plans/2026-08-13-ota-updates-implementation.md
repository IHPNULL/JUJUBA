# Releases e Atualização OTA — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo de atualização OTA (Over-The-Air) via EAS Update, incluindo workflow de CI/CD e interface de usuário para aplicação da atualização.

**Architecture:** Utilização do módulo `expo-updates` para checagem e download em background, com controle de estado via Redux (`updatesSlice`) e interface não-bloqueante (`UpdateBanner`).

**Tech Stack:** `expo-updates`, `EAS Update`, `Redux Toolkit`, `GitHub Actions`.

## Global Constraints

- O app não recarrega sozinho; a atualização exige ação explícita do usuário.
- Checagem oportunista com throttle de 1 hora.
- Falhas de rede são tratadas silenciosamente (retorno ao estado `idle`).
- Compatibilidade nativa garantida via `runtimeVersion.policy: "appVersion"`.

---

### Task 1: Configuração do Projeto e Dependências

**Files:**
- Modify: `package.json`
- Modify: `app.json`

**Interfaces:**
- Produces: `expo-updates` instalado e configurado no manifesto.

- [ ] **Step 1: Instalar `expo-updates`**

Run: `npx expo install expo-updates`

- [ ] **Step 2: Configurar `app.json`**

Adicionar plugin e configurações de atualização.

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/PROJECT_ID",
      "checkAutomatically": "NEVER"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "plugins": [
      "expo-updates",
      ...
    ]
  }
}
```
*Nota: A URL e PROJECT_ID serão preenchidos pelo EAS CLI posteriormente, mas a estrutura deve estar presente.*

- [ ] **Step 3: Commit**

```bash
git add package.json app.json
git commit -m "chore: add and configure expo-updates"
```

---

### Task 2: Implementação do `updatesSlice`

**Files:**
- Create: `src/presentation/store/updatesSlice.ts`
- Modify: `src/presentation/store/store.ts`

**Interfaces:**
- Produces: `updatesSlice` com estados `idle`, `checking`, `disponivel`, `baixando`, `pronta`.

- [ ] **Step 1: Criar o slice de atualizações**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UpdateStatus = 'idle' | 'checking' | 'disponivel' | 'baixando' | 'pronta';

interface UpdatesState {
  status: UpdateStatus;
  lastCheckTimestamp: number | null;
  error: string | null;
}

const initialState: UpdatesState = {
  status: 'idle',
  lastCheckTimestamp: null,
  error: null,
};

const updatesSlice = createSlice({
  name: 'updates',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<UpdateStatus>) => {
      state.status = action.payload;
      if (action.payload === 'checking') {
        state.lastCheckTimestamp = Date.now();
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setStatus, setError } = updatesSlice.actions;
export default updatesSlice.reducer;
```

- [ ] **Step 2: Registrar o reducer no store**

Adicionar `updates: updatesReducer` ao `combineReducers` ou `configureStore`.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/store/updatesSlice.ts src/presentation/store/store.ts
git commit -m "feat: add updatesSlice to Redux store"
```

---

### Task 3: Hook `useAppUpdates`

**Files:**
- Create: `src/presentation/hooks/useAppUpdates.ts`

**Interfaces:**
- Consumes: `updatesSlice`
- Produces: Hook que gerencia o ciclo de vida da atualização.

- [ ] **Step 1: Implementar o hook**

O hook deve escutar `AppState`, aplicar throttle de 1h e gerenciar o download via `expo-updates`.

```typescript
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setStatus, setError } from '../store/updatesSlice';

const THROTTLE_MS = 60 * 60 * 1000; // 1 hora

export function useAppUpdates() {
  const dispatch = useAppDispatch();
  const { status, lastCheckTimestamp } = useAppSelector((state) => state.updates);

  const checkForUpdates = async () => {
    if (status !== 'idle') return;
    
    const now = Date.now();
    if (lastCheckTimestamp && now - lastCheckTimestamp < THROTTLE_MS) return;

    try {
      dispatch(setStatus('checking'));
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        dispatch(setStatus('disponivel'));
        dispatch(setStatus('baixando'));
        await Updates.fetchUpdateAsync();
        dispatch(setStatus('pronta'));
      } else {
        dispatch(setStatus('idle'));
      }
    } catch (e) {
      dispatch(setError(e instanceof Error ? e.message : 'Unknown error'));
      dispatch(setStatus('idle'));
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForUpdates();
      }
    });

    checkForUpdates(); // Cold launch check

    return () => subscription.remove();
  }, []);

  const reloadApp = async () => {
    if (status === 'pronta') {
      await Updates.reloadAsync();
    }
  };

  return { status, reloadApp };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/presentation/hooks/useAppUpdates.ts
git commit -m "feat: implement useAppUpdates hook"
```

---

### Task 4: Componente `UpdateBanner`

**Files:**
- Create: `src/presentation/shared/components/UpdateBanner.tsx`
- Modify: `app/_layout.tsx` (ou componente global equivalente)

**Interfaces:**
- Consumes: `useAppUpdates`
- Produces: Banner visual quando `status === 'pronta'`.

- [ ] **Step 1: Criar o componente visual**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppUpdates } from '../../hooks/useAppUpdates';

export function UpdateBanner() {
  const { status, reloadApp } = useAppUpdates();

  if (status !== 'pronta') return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Nova versão disponível!</Text>
      <TouchableOpacity style={styles.button} onPress={reloadApp}>
        <Text style={styles.buttonText}>Atualizar agora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007AFF',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { color: 'white', fontWeight: 'bold' },
  button: { backgroundColor: 'white', padding: 6, borderRadius: 4 },
  buttonText: { color: '#007AFF', fontSize: 12, fontWeight: 'bold' },
});
```

- [ ] **Step 2: Integrar no layout principal**

Incluir `<UpdateBanner />` no `_layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/shared/components/UpdateBanner.tsx app/_layout.tsx
git commit -m "feat: add UpdateBanner to UI"
```

---

### Task 5: Workflow do GitHub Actions

**Files:**
- Create: `.github/workflows/eas-update.yml`

**Interfaces:**
- Produces: Pipeline automatizada para publicação no branch `production`.

- [ ] **Step 1: Criar o arquivo de workflow**

```yaml
name: EAS Update
on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-cache: true
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish Update
        run: eas update --branch production --non-interactive --message "${{ github.sha }}"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/eas-update.yml
git commit -m "ci: add EAS Update workflow"
```

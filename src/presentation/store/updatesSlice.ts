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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FormulaSpec } from "../../domain/formula/types";

interface SpecState {
  ativa: FormulaSpec | null;
}

const initialState: SpecState = { ativa: null };

const specSlice = createSlice({
  name: "spec",
  initialState,
  reducers: {
    especificarFormulaAtiva(state, action: PayloadAction<FormulaSpec>) {
      state.ativa = action.payload;
    },
  },
});

export const { especificarFormulaAtiva } = specSlice.actions;
export default specSlice.reducer;

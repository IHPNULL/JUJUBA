import { configureStore } from "@reduxjs/toolkit";
import specReducer from "./specSlice";
import updatesReducer from "./updatesSlice";
import inicioReducer from "./inicioSlice";

export const store = configureStore({
  reducer: {
    spec: specReducer,
    updates: updatesReducer,
    inicio: inicioReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { configureStore } from "@reduxjs/toolkit";
import specReducer from "./specSlice";
import updatesReducer from "./updatesSlice";

export const store = configureStore({
  reducer: {
    spec: specReducer,
    updates: updatesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

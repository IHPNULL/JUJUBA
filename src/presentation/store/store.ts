import { configureStore } from "@reduxjs/toolkit";
import specReducer from "./specSlice";

export const store = configureStore({
  reducer: {
    spec: specReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

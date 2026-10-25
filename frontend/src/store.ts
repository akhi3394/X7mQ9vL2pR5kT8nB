import { configureStore } from '@reduxjs/toolkit'
import { windApi } from './windApi'

export const store = configureStore({
  reducer: { [windApi.reducerPath]: windApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(windApi.middleware),
})

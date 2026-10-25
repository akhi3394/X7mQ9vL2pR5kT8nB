import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Point {
  start_time: string
  forecast_mw: number | null
  actual_mw: number | null
  publish_time: string | null
  lead_hours: number | null
  error_mw: number | null
  high_error: boolean
}

export interface Metrics {
  count: number
  mae_mw: number | null
  rmse_mw: number | null
  bias_mw: number | null
  mape_pct: number | null
}

export interface Dashboard {
  period_start: string
  period_end: string
  fuel_type: string
  updated_at: string
  source: string
  selection_rule: string
  high_error_threshold_mw: number | null
  high_error_count: number
  latest_forecast: Point | null
  points: Point[]
  metrics: Metrics
  hourly_accuracy: { hour: number; mae_mw: number; count: number }[]
  lead_accuracy: { lead_hours: number; mae_mw: number; count: number }[]
  residuals: number[]
}

export const windApi = createApi({
  reducerPath: 'windApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${import.meta.env.VITE_API_BASE_URL ?? '/api/'}${(import.meta.env.VITE_API_BASE_URL ?? '/api/').endsWith('/') ? '' : '/'}` }),
  keepUnusedDataFor: 300,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboard: builder.query<Dashboard, void>({
      query: () => 'dashboard',
      keepUnusedDataFor: 300,
      providesTags: ['Dashboard'],
    }),
    refreshDashboard: builder.mutation<Dashboard, void>({
      query: () => ({ url: 'dashboard?refresh=true', method: 'GET' }),
      invalidatesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetDashboardQuery, useRefreshDashboardMutation } = windApi

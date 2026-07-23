import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { ActivityTypeViewModel } from './types'

export type ActivityTypesByCategory = { category: string; types: ActivityTypeViewModel[] }[]

export function useActivityTypes(): UseQueryResult<ActivityTypesByCategory> {
  return useQuery({
    queryKey: ['activity_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('id, key, label, category, icon, base_xp, daily_cap')
        .eq('is_active', true)
        .order('category')
        .order('base_xp')

      if (error) {
        throw error
      }

      const byCategory = new Map<string, ActivityTypeViewModel[]>()

      for (const row of data) {
        const type: ActivityTypeViewModel = {
          id: row.id,
          key: row.key,
          label: row.label,
          category: row.category,
          icon: row.icon,
          baseXp: row.base_xp,
          dailyCap: row.daily_cap,
        }
        const group = byCategory.get(row.category) ?? []
        group.push(type)
        byCategory.set(row.category, group)
      }

      return Array.from(byCategory.entries()).map(([category, types]) => ({ category, types }))
    },
  })
}

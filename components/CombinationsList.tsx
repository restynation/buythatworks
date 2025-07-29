'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Setup, Product, DeviceType } from '@/lib/types'
import CombinationCard from './CombinationCard'
import FilterBar from './FilterBar'

export default function CombinationsList() {
  const [setups, setSetups] = useState<(Setup & { 
    blocks?: Array<{ product?: Product; device_type?: DeviceType }> 
  })[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<{
    deviceIds: number[]
    realOnly: boolean
  }>({
    deviceIds: [],
    realOnly: false
  })

  const loadSetups = useCallback(async (pageNum: number, resetList = false) => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('setups')
        .select(`
          *,
          setup_blocks (
            product:products (*),
            device_type:device_types (*)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(pageNum * 10, (pageNum * 10) + 9)

      if (filters.realOnly) {
        query = query.eq('is_current', true)
      }

      // Apply device filters if any are selected
      if (filters.deviceIds.length > 0) {
        // This would need to be implemented via the setup_filters materialized view
        // For now, we'll filter client-side as a placeholder
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading setups:', error)
        return
      }

      if (resetList) {
        setSetups(data || [])
      } else {
        setSetups(prev => [...prev, ...(data || [])])
      }
      
      setHasMore((data?.length || 0) === 10)
    } catch (err) {
      console.error('Failed to load setups:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    setPage(0)
    loadSetups(0, true)
  }, [filters, loadSetups])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadSetups(nextPage)
    }
  }, [page, loading, hasMore, loadSetups])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 1.0 }
    )

    const sentinel = document.getElementById('scroll-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div>
      <FilterBar 
        filters={filters} 
        onFiltersChange={setFilters} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {setups.map((setup) => (
          <CombinationCard key={setup.id} setup={setup} />
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading setups...</p>
        </div>
      )}

      {!loading && setups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No setups found matching your criteria.</p>
        </div>
      )}

      {hasMore && <div id="scroll-sentinel" className="h-4" />}
    </div>
  )
} 
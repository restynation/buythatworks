'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/lib/types'
import { X } from 'lucide-react'

interface Props {
  filters: {
    deviceIds: number[]
    realOnly: boolean
  }
  onFiltersChange: (filters: { deviceIds: number[]; realOnly: boolean }) => void
}

export default function FilterBar({ filters, onFiltersChange }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          device_type:device_types (*)
        `)
        .order('brand')
        .order('model')

      if (error) {
        console.error('Error loading products:', error)
        return
      }

      setProducts(data || [])
    } catch (err) {
      console.error('Failed to load products:', err)
    }
  }

  const filteredProducts = products.filter(product =>
    `${product.brand} ${product.model}`.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !filters.deviceIds.includes(product.id)
  )

  const selectedProducts = products.filter(product => 
    filters.deviceIds.includes(product.id)
  )

  const addDevice = (productId: number) => {
    onFiltersChange({
      ...filters,
      deviceIds: [...filters.deviceIds, productId]
    })
    setSearchTerm('')
    setShowDropdown(false)
  }

  const removeDevice = (productId: number) => {
    onFiltersChange({
      ...filters,
      deviceIds: filters.deviceIds.filter(id => id !== productId)
    })
  }

  const toggleRealOnly = () => {
    onFiltersChange({
      ...filters,
      realOnly: !filters.realOnly
    })
  }

  return (
    <div className="space-y-4">
      {/* Selected device chips */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map(product => (
            <div
              key={product.id}
              className="inline-flex items-center bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full"
            >
              <span>{product.brand} {product.model}</span>
              <button
                onClick={() => removeDevice(product.id)}
                className="ml-2 hover:bg-primary-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Device search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Add devices to filter..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(e.target.value.length > 0)
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a]"
          />
          
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredProducts.slice(0, 10).map(product => (
                <button
                  key={product.id}
                  onClick={() => addDevice(product.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="font-medium">{product.brand} {product.model}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {product.device_type?.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real only checkbox */}
        <label className="flex items-center space-x-2 whitespace-nowrap">
          <input
            type="checkbox"
            checked={filters.realOnly}
            onChange={toggleRealOnly}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">
            See only real users' setups
          </span>
        </label>
      </div>
    </div>
  )
} 
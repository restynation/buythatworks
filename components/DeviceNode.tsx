'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Handle, Position } from 'reactflow'
import { DeviceType, Product } from '@/lib/types'
import { Trash2 } from 'lucide-react'

interface DeviceNodeData {
  deviceType: DeviceType
  product?: Product
  customName?: string
  products: Product[]
  onUpdate: (nodeId: string, data: any) => void
  onDelete: (nodeId: string) => void
  canDelete: boolean
}

interface Props {
  id: string
  data: DeviceNodeData
}

export default function DeviceNode({ id, data }: Props) {
  const [openDropdown, setOpenDropdown] = useState(false)
  const [closingDropdown, setClosingDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [customName, setCustomName] = useState(data.customName || '')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const isTextInput = ['mouse', 'keyboard', 'hub'].includes(data.deviceType.name)
  
  // Outside click detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Element)) {
        // Check if the click is on a React Flow node/element that should not close the dropdown
        const target = event.target as HTMLElement
        
        // Don't close if clicking on React Flow handles or other nodes
        if (target.closest('.react-flow__node') && !target.closest(`[data-id="${id}"]`)) {
          return
        }
        
        // Don't close if clicking on React Flow background or edges
        if (target.closest('.react-flow__pane') || target.closest('.react-flow__edge')) {
          // Add a data attribute to indicate dropdown should not trigger context menu
          document.body.setAttribute('data-dropdown-closing', 'true')
          setTimeout(() => {
            document.body.removeAttribute('data-dropdown-closing')
          }, 100)
        }
        
        closeDropdown()
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openDropdown, id])

  const getFilteredProducts = () => {
    return data.products.filter(p => 
      searchTerm === '' || 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const toggleDropdown = () => {
    if (openDropdown) {
      closeDropdown()
    } else {
      setOpenDropdown(true)
      setClosingDropdown(false)
    }
  }

  const closeDropdown = () => {
    if (openDropdown) {
      setClosingDropdown(true)
      setTimeout(() => {
        setOpenDropdown(false)
        setClosingDropdown(false)
        setSearchTerm('')
      }, 200) // Match animation duration
    }
  }

  const handleProductSelect = (product: Product) => {
    data.onUpdate(id, { product, customName: '' })
    closeDropdown()
  }

  const handleCustomNameSave = () => {
    if (customName.trim()) {
      data.onUpdate(id, { customName: customName.trim(), product: null })
    }
  }

  const getDisplayText = () => {
    if (data.product) {
      return `${data.product.brand} ${data.product.model}`
    }
    if (data.customName) {
      return data.customName
    }
    return `Select ${data.deviceType.name}`
  }

  const filteredProducts = getFilteredProducts()

  return (
    <div className="relative group bg-white border border-[#e1e3e6] rounded-[24px] w-[180px] h-[180px] p-2">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !left-[-6px] !top-1/2 !transform !-translate-y-1/2" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !right-[-6px] !top-1/2 !transform !-translate-y-1/2" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !top-[-6px] !left-1/2 !transform !-translate-x-1/2" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !bottom-[-6px] !left-1/2 !transform !-translate-x-1/2" 
      />

      {/* Delete button */}
      {data.canDelete && (
        <button
          onClick={() => data.onDelete(id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-1 shadow-md hover:shadow-lg z-10"
        >
          <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
        </button>
      )}

      <div className="flex flex-col h-full">
        {/* Image area */}
        <div className="w-[164px] h-[124px] p-4 flex items-center justify-center">
          {data.product?.image_url ? (
            <img 
              src={data.product.image_url} 
              alt={`${data.product.brand} ${data.product.model}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center">
              No image
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="relative flex-1">
          {isTextInput ? (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={handleCustomNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomNameSave()}
              placeholder={`Enter ${data.deviceType.name} name`}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a]"
            />
          ) : (
            <>
              <button
                onClick={toggleDropdown}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-[12px] bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="truncate text-left flex-1">
                  {getDisplayText()}
                </span>
                <svg 
                  className={`w-4 h-4 ml-2 transition-transform duration-200 flex-shrink-0 ${
                    openDropdown ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {(openDropdown || closingDropdown) && (
                <div 
                  ref={dropdownRef}
                  className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[180px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-20 duration-200 ${
                    closingDropdown ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                  }`}
                >
                  {/* Search input */}
                  <div className="p-3 border-b border-gray-100">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a]"
                      autoFocus
                    />
                  </div>
                  
                  {/* Product list */}
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <div className="font-medium">{product.brand}</div>
                          <div className="text-gray-500 text-xs">{product.model}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {searchTerm ? 'No results found' : 'No products available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 
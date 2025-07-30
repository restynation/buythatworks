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
      console.log('DeviceNode: handleClickOutside triggered')
      
      if (!dropdownRef.current) {
        console.log('DeviceNode: No dropdown ref, returning')
        return
      }
      
      const target = event.target as Element
      if (!target) {
        console.log('DeviceNode: No target, returning')
        return
      }
      
      // Check if click is inside dropdown
      if (dropdownRef.current.contains(target)) {
        console.log('DeviceNode: Click is inside dropdown, not closing')
        return
      }
      
      console.log('DeviceNode: Outside click detected, target:', target.className)
      
      // Set flag to prevent context menu for any React Flow related clicks
      const targetElement = target as HTMLElement
      const isReactFlowRelated = targetElement.closest('.react-flow') ||
                               targetElement.closest('.react-flow__pane') ||
                               targetElement.closest('.react-flow__edge') ||
                               targetElement.classList.contains('react-flow__pane') ||
                               targetElement.closest('[data-testid="rf__wrapper"]')
      
      if (isReactFlowRelated) {
        console.log('DeviceNode: React Flow related click, setting prevention flag')
        document.body.setAttribute('data-dropdown-closing', 'true')
        setTimeout(() => {
          document.body.removeAttribute('data-dropdown-closing')
          console.log('DeviceNode: Prevention flag removed')
        }, 200)
      }
      
      // Always close dropdown on outside click
      console.log('DeviceNode: Closing dropdown')
      closeDropdown()
    }

    if (openDropdown) {
      console.log('DeviceNode: Adding outside click listener for dropdown')
      // Use capture phase to ensure we catch the event early
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        console.log('DeviceNode: Removing outside click listener')
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [openDropdown])

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
    data.onUpdate(id, { product, customName: undefined })
    closeDropdown()
  }

  const handleCustomNameChange = (value: string) => {
    setCustomName(value)
    data.onUpdate(id, { customName: value, product: undefined })
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
      {/* Connection Handles - Updated design */}
      <Handle 
        id="left"
        type="source" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-[#FFFFFF] !border !border-[#C4C7CC] !left-[-6px] !top-1/2 !transform !-translate-y-1/2 !z-10 !cursor-crosshair hover:!bg-[#15171a] hover:!scale-110 !transition-all !duration-200" 
        style={{ pointerEvents: 'all' }}
      />
      <Handle 
        id="left-target"
        type="target" 
        position={Position.Left} 
        className="!w-6 !h-6 !bg-transparent !border-0 !left-[-12px] !top-1/2 !transform !-translate-y-1/2 !z-9" 
        style={{ pointerEvents: 'all' }}
      />
      
      <Handle 
        id="right"
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-[#FFFFFF] !border !border-[#C4C7CC] !right-[-6px] !top-1/2 !transform !-translate-y-1/2 !z-10 !cursor-crosshair hover:!bg-[#15171a] hover:!scale-110 !transition-all !duration-200" 
        style={{ pointerEvents: 'all' }}
      />
      <Handle 
        id="right-target"
        type="target" 
        position={Position.Right} 
        className="!w-6 !h-6 !bg-transparent !border-0 !right-[-12px] !top-1/2 !transform !-translate-y-1/2 !z-9" 
        style={{ pointerEvents: 'all' }}
      />
      
      <Handle 
        id="top"
        type="source" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-[#FFFFFF] !border !border-[#C4C7CC] !top-[-6px] !left-1/2 !transform !-translate-x-1/2 !z-10 !cursor-crosshair hover:!bg-[#15171a] hover:!scale-110 !transition-all !duration-200" 
        style={{ pointerEvents: 'all' }}
      />
      <Handle 
        id="top-target"
        type="target" 
        position={Position.Top} 
        className="!w-6 !h-6 !bg-transparent !border-0 !top-[-12px] !left-1/2 !transform !-translate-x-1/2 !z-9" 
        style={{ pointerEvents: 'all' }}
      />
      
      <Handle 
        id="bottom"
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-[#FFFFFF] !border !border-[#C4C7CC] !bottom-[-6px] !left-1/2 !transform !-translate-x-1/2 !z-10 !cursor-crosshair hover:!bg-[#15171a] hover:!scale-110 !transition-all !duration-200" 
        style={{ pointerEvents: 'all' }}
      />
      <Handle 
        id="bottom-target"
        type="target" 
        position={Position.Bottom} 
        className="!w-6 !h-6 !bg-transparent !border-0 !bottom-[-12px] !left-1/2 !transform !-translate-x-1/2 !z-9" 
        style={{ pointerEvents: 'all' }}
      />

      {/* Delete button */}
      {data.canDelete && (
        <button
          onClick={() => data.onDelete(id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-1 shadow-md hover:shadow-lg z-20"
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
            <div className="text-4xl">
              {data.deviceType.name === 'computer' && '💻'}
              {data.deviceType.name === 'monitor' && '🖥️'}
              {data.deviceType.name === 'hub' && '🔌'}
              {data.deviceType.name === 'mouse' && '🖱️'}
              {data.deviceType.name === 'keyboard' && '⌨️'}
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="relative" data-dropdown>
          {isTextInput ? (
            <input
              type="text"
              placeholder={`Enter ${data.deviceType.name} name`}
              value={customName}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#15171a] w-full border-none outline-none"
            />
          ) : (
            <>
              <button
                onClick={toggleDropdown}
                className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#15171a] flex items-center justify-between w-full"
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
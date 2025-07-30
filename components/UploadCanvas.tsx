'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUploadStore } from '@/lib/stores/uploadStore'
import { DeviceType, PortType, Product } from '@/lib/types'
import { Plus } from 'lucide-react'

interface DeviceBlock {
  id: string
  deviceType: DeviceType
  product?: Product
  customName?: string
  position: { x: number; y: number }
}

interface UploadCanvasProps {
  setupName: string
  builderName: string
  deviceBlocks: DeviceBlock[]
  setDeviceBlocks: React.Dispatch<React.SetStateAction<DeviceBlock[]>>
}

export default function UploadCanvas({ setupName, builderName, deviceBlocks, setDeviceBlocks }: UploadCanvasProps) {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [closingDropdownId, setClosingDropdownId] = useState<string | null>(null)
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})

  useEffect(() => {
    loadReferenceData()
  }, [])

  useEffect(() => {
    // 컴퓨터 블록 자동 추가
    if (deviceTypes.length > 0 && deviceBlocks.length === 0) {
      const computerType = deviceTypes.find(t => t.name === 'computer')
      if (computerType) {
        addDeviceBlock(computerType)
      }
    }
  }, [deviceTypes, deviceBlocks])

  const loadReferenceData = async () => {
    try {
      const [deviceTypesResult, productsResult] = await Promise.all([
        supabase.from('device_types').select('*'),
        supabase.from('products').select('*, device_type:device_types(*)').order('brand').order('model')
      ])

      if (deviceTypesResult.data) setDeviceTypes(deviceTypesResult.data)
      if (productsResult.data) setProducts(productsResult.data)
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const addDeviceBlock = (deviceType: DeviceType) => {
    const newBlock: DeviceBlock = {
      id: `block-${Date.now()}`,
      deviceType,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
    }
    setDeviceBlocks([...deviceBlocks, newBlock])
    setShowAddMenu(false)
  }

  const updateBlock = (blockId: string, updates: Partial<DeviceBlock>) => {
    setDeviceBlocks((blocks: DeviceBlock[]) => 
      blocks.map((block: DeviceBlock) => 
        block.id === blockId ? { ...block, ...updates } : block
      )
    )
  }

  const removeBlock = (blockId: string) => {
    const block = deviceBlocks.find((b: DeviceBlock) => b.id === blockId)
    // 컴퓨터 블록은 삭제 방지 (최소 1개 유지)
    if (block?.deviceType.name === 'computer') {
      const computerCount = deviceBlocks.filter((b: DeviceBlock) => b.deviceType.name === 'computer').length
      if (computerCount <= 1) return
    }
    setDeviceBlocks((blocks: DeviceBlock[]) => blocks.filter((b: DeviceBlock) => b.id !== blockId))
  }

  const getFilteredProducts = (deviceTypeId: number, blockId: string) => {
    const searchTerm = searchTerms[blockId] || ''
    return products
      .filter(p => p.device_type_id === deviceTypeId)
      .filter(p => 
        searchTerm === '' || 
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
  }

  const toggleDropdown = (blockId: string) => {
    if (openDropdownId === blockId) {
      closeDropdown()
    } else {
      setOpenDropdownId(blockId)
      setClosingDropdownId(null)
    }
  }

  const closeDropdown = () => {
    if (openDropdownId) {
      setClosingDropdownId(openDropdownId)
      setOpenDropdownId(null)
      setTimeout(() => {
        setClosingDropdownId(null)
      }, 200)
    }
  }

  const handleProductSelect = (blockId: string, product: Product) => {
    updateBlock(blockId, { product, customName: undefined })
    closeDropdown()
    setSearchTerms(prev => ({ ...prev, [blockId]: '' }))
  }

  const renderDeviceBlock = (block: DeviceBlock) => {
    const isTextInput = ['mouse', 'keyboard', 'hub'].includes(block.deviceType.name)
    const filteredProducts = getFilteredProducts(block.deviceType.id, block.id)

    return (
      <div
        key={block.id}
        className="absolute group bg-white border border-[#e1e3e6] rounded-[24px] w-[180px] h-[180px] p-2"
        style={{ left: block.position.x, top: block.position.y }}
      >
        {/* 삭제 버튼 */}
        {!(block.deviceType.name === 'computer' && deviceBlocks.filter(b => b.deviceType.name === 'computer').length === 1) && (
          <button
            onClick={() => removeBlock(block.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-1 shadow-md hover:shadow-lg z-10"
          >
            <svg className="w-4 h-4 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="flex flex-col h-full">
          {/* 이미지 영역 */}
          <div className="w-[164px] h-[124px] p-4 flex items-center justify-center">
            {block.product?.image_url ? (
              <img 
                src={block.product.image_url} 
                alt={`${block.product.brand} ${block.product.model}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-4xl">
                {block.deviceType.name === 'computer' && '💻'}
                {block.deviceType.name === 'monitor' && '🖥️'}
                {block.deviceType.name === 'hub' && '🔌'}
                {block.deviceType.name === 'mouse' && '🖱️'}
                {block.deviceType.name === 'keyboard' && '⌨️'}
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="relative" data-dropdown>
            {isTextInput ? (
              <input
                type="text"
                placeholder={`Enter ${block.deviceType.name} name`}
                value={block.customName || ''}
                onChange={(e) => updateBlock(block.id, { customName: e.target.value })}
                className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#15171a] w-full border-none outline-none"
              />
            ) : (
              <>
                <button
                  onClick={() => toggleDropdown(block.id)}
                  className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#15171a] flex items-center justify-between w-full"
                >
                  <span className="truncate">
                    {block.product ? `${block.product.brand} ${block.product.model}` : `Select ${block.deviceType.name}`}
                  </span>
                  <svg 
                    className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                      openDropdownId === block.id ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {(openDropdownId === block.id || closingDropdownId === block.id) && (
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[180px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-20 duration-200 ${
                    closingDropdownId === block.id ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                  }`}>
                    {/* 검색 입력 */}
                    <div className="p-3 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerms[block.id] || ''}
                        onChange={(e) => setSearchTerms(prev => ({ ...prev, [block.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    
                    {/* 옵션 목록 */}
                    <div className="max-h-80 overflow-y-auto scrollbar-hide">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(block.id, product)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                          >
                            <div className="font-medium">{product.brand}</div>
                            <div className="text-gray-500 text-xs">{product.model}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {searchTerms[block.id] ? 'No results found' : 'No products available'}
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

  const addMenuItems = [
    { type: 'monitor', label: 'Monitor', icon: '🖥️' },
    { type: 'hub', label: 'Hub', icon: '🔌' },
    { type: 'mouse', label: 'Mouse', icon: '🖱️' },
    { type: 'keyboard', label: 'Keyboard', icon: '⌨️' },
  ]

  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* 캔버스 영역 */}
      <div className="w-full h-full relative overflow-hidden">
        {deviceBlocks.map(renderDeviceBlock)}
      </div>

      {/* 우측 하단 + 버튼 */}
      <div className="absolute bottom-6 right-6">
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-12 h-12 bg-[#15171a] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* 추가 메뉴 드롭다운 */}
          {showAddMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg py-2 animate-in fade-in slide-in-from-bottom-2">
              {addMenuItems.map((item) => {
                const deviceType = deviceTypes.find(t => t.name === item.type)
                if (!deviceType) return null
                
                return (
                  <button
                    key={item.type}
                    onClick={() => addDeviceBlock(deviceType)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
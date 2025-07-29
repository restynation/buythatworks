'use client'

import React, { useState } from 'react'
import { Handle, Position } from 'reactflow'
import { DeviceType, Product } from '@/lib/types'
import { useUploadStore } from '@/lib/stores/uploadStore'
import { Monitor, Cpu, HardDrive, Mouse, Keyboard, Trash2 } from 'lucide-react'

interface DeviceNodeData {
  deviceType: DeviceType
  product?: Product
  customName?: string
  onUpdate: (nodeId: string, data: any) => void
  onDelete: (nodeId: string) => void
  canDelete: boolean
}

interface Props {
  id: string
  data: DeviceNodeData
}

const deviceIcons = {
  computer: Cpu,
  monitor: Monitor,
  hub: HardDrive,
  mouse: Mouse,
  keyboard: Keyboard,
}

export default function DeviceNode({ id, data }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [customName, setCustomName] = useState(data.customName || '')
  const { products } = useUploadStore()
  
  const Icon = deviceIcons[data.deviceType.name] || HardDrive
  
  const deviceProducts = products.filter(p => 
    p.device_type_id === data.deviceType.id
  )

  const needsProduct = ['computer', 'monitor'].includes(data.deviceType.name)
  const needsCustomName = !needsProduct

  const handleProductSelect = (productId: number) => {
    const product = products.find(p => p.id === productId)
    data.onUpdate(id, { product })
  }

  const handleCustomNameSave = () => {
    if (customName.trim()) {
      data.onUpdate(id, { customName: customName.trim() })
      setIsEditing(false)
    }
  }

  const getDisplayName = () => {
    if (data.product) {
      return `${data.product.brand} ${data.product.model}`
    }
    if (data.customName) {
      return data.customName
    }
    return `Select ${data.deviceType.name}`
  }

  const isConfigured = needsProduct ? !!data.product : !!data.customName

  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[180px] ${
      isConfigured ? 'border-green-300' : 'border-red-300'
    }`}>
      {/* Handles for connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-500" 
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {data.deviceType.name}
          </span>
        </div>
        
        {data.canDelete && (
          <button
            onClick={() => data.onDelete(id)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {needsProduct && (
        <div className="space-y-2">
          <select
            value={data.product?.id || ''}
            onChange={(e) => handleProductSelect(Number(e.target.value))}
            className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select {data.deviceType.name}</option>
            {deviceProducts.map(product => (
              <option key={product.id} value={product.id}>
                {product.brand} {product.model}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsCustomName && (
        <div className="space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`Enter ${data.deviceType.name} name`}
                className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomNameSave()
                  }
                }}
                autoFocus
              />
              <div className="flex space-x-1">
                <button
                  onClick={handleCustomNameSave}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setCustomName(data.customName || '')
                  }}
                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full text-xs p-2 border border-gray-300 rounded hover:bg-gray-50 text-left"
            >
              {data.customName || `Click to name ${data.deviceType.name}`}
            </button>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 truncate">
        {getDisplayName()}
      </div>
    </div>
  )
} 
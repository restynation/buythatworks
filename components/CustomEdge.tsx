'use client'

import React, { useState, useRef, useEffect } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { ArrowRight, Trash2, ChevronDown } from 'lucide-react'

interface CustomEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: any
  targetPosition?: any
  data?: {
    sourcePortType?: { id: number; code: string }
    targetPortType?: { id: number; code: string }
    sourceHandle?: string
    targetHandle?: string
    sourceNodeId?: string
    targetNodeId?: string
    onUpdate?: (edgeId: string, data: any) => void
    onDelete?: (edgeId: string) => void
    portTypes?: Array<{ id: number; code: string }>
  }
  selected?: boolean
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const [leftDropdownOpen, setLeftDropdownOpen] = useState(false)
  const [rightDropdownOpen, setRightDropdownOpen] = useState(false)
  const leftDropdownRef = useRef<HTMLDivElement>(null)
  const rightDropdownRef = useRef<HTMLDivElement>(null)

  // Determine left and right ports based on node positions
  const isSourceLeft = sourceX < targetX
  const leftPort = isSourceLeft ? data?.sourcePortType : data?.targetPortType
  const rightPort = isSourceLeft ? data?.targetPortType : data?.sourcePortType
  const leftNodeId = isSourceLeft ? data?.sourceNodeId : data?.targetNodeId
  const rightNodeId = isSourceLeft ? data?.targetNodeId : data?.sourceNodeId

  // Outside click detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leftDropdownRef.current && !leftDropdownRef.current.contains(event.target as Node)) {
        setLeftDropdownOpen(false)
      }
      if (rightDropdownRef.current && !rightDropdownRef.current.contains(event.target as Node)) {
        setRightDropdownOpen(false)
      }
    }

    if (leftDropdownOpen || rightDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [leftDropdownOpen, rightDropdownOpen])

  const handlePortSelect = (portType: { id: number; code: string }, isLeft: boolean) => {
    if (data?.onUpdate) {
      const updateData = isLeft 
        ? { sourcePortType: portType }
        : { targetPortType: portType }
      data.onUpdate(id, updateData)
    }
    if (isLeft) {
      setLeftDropdownOpen(false)
    } else {
      setRightDropdownOpen(false)
    }
  }

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id)
    }
  }

  if (selected) {
    return (
      <>
        <BaseEdge path={edgePath} />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[24px] px-3 py-2 whitespace-nowrap shadow-lg">
              {/* Left Port Dropdown */}
              <div className="relative" ref={leftDropdownRef}>
                <button
                  onClick={() => setLeftDropdownOpen(!leftDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[#6B7280] text-xs font-medium">
                    {leftPort?.code || 'Select'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                </button>
                {leftDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    {data?.portTypes?.map((portType) => (
                      <button
                        key={portType.id}
                        onClick={() => handlePortSelect(portType, true)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {portType.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="flex items-center justify-center w-6 h-6 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>

              {/* Right Port Dropdown */}
              <div className="relative" ref={rightDropdownRef}>
                <button
                  onClick={() => setRightDropdownOpen(!rightDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[#6B7280] text-xs font-medium">
                    {rightPort?.code || 'Select'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                </button>
                {rightDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    {data?.portTypes?.map((portType) => (
                      <button
                        key={portType.id}
                        onClick={() => handlePortSelect(portType, false)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {portType.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }

  // Non-selected state - show port information
  const sourcePortCode = data?.sourcePortType?.code || 'TYPE_C'
  const targetPortCode = data?.targetPortType?.code || 'TYPE_C'

  return (
    <>
      <BaseEdge path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-[24px] px-2 py-1 whitespace-nowrap">
            <span className="text-[#6B7280] text-xs font-medium">
              {leftPort?.code || sourcePortCode}
            </span>
            <ArrowRight className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs font-medium">
              {rightPort?.code || targetPortCode}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 
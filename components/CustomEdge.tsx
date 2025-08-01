'use client'

import React, { useState, useRef, useEffect } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { ArrowRight, Trash2, ChevronDown, ArrowLeftRight } from 'lucide-react'

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
    isInputMode?: boolean
    isCompleted?: boolean
    isViewerMode?: boolean
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
  const [leftClosingDropdown, setLeftClosingDropdown] = useState(false)
  const [rightClosingDropdown, setRightClosingDropdown] = useState(false)
  const leftDropdownRef = useRef<HTMLDivElement>(null)
  const rightDropdownRef = useRef<HTMLDivElement>(null)

  // Determine left and right ports based on node positions
  const isSourceLeft = sourceX < targetX
  const leftPort = isSourceLeft ? data?.sourcePortType : data?.targetPortType
  const rightPort = isSourceLeft ? data?.targetPortType : data?.sourcePortType

  // Outside click detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leftDropdownRef.current && !leftDropdownRef.current.contains(event.target as Node)) {
        // Set flag to prevent context menu
        document.body.setAttribute('data-dropdown-closing', 'true')
        setTimeout(() => {
          document.body.removeAttribute('data-dropdown-closing')
        }, 200)
        closeLeftDropdown()
      }
      if (rightDropdownRef.current && !rightDropdownRef.current.contains(event.target as Node)) {
        // Set flag to prevent context menu
        document.body.setAttribute('data-dropdown-closing', 'true')
        setTimeout(() => {
          document.body.removeAttribute('data-dropdown-closing')
        }, 200)
        closeRightDropdown()
      }
    }

    if (leftDropdownOpen || rightDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [leftDropdownOpen, rightDropdownOpen])

  const closeLeftDropdown = () => {
    setLeftClosingDropdown(true)
    setTimeout(() => {
      setLeftDropdownOpen(false)
      setLeftClosingDropdown(false)
    }, 200)
  }

  const closeRightDropdown = () => {
    setRightClosingDropdown(true)
    setTimeout(() => {
      setRightDropdownOpen(false)
      setRightClosingDropdown(false)
    }, 200)
  }

  const handlePortSelect = (portType: { id: number; code: string }, isLeft: boolean) => {
    if (data?.onUpdate) {
      // Determine which port to update based on node positions
      const isSourceLeft = sourceX < targetX
      let updateData: any

      if (isSourceLeft) {
        // Source is left, Target is right
        updateData = isLeft 
          ? { sourcePortType: portType }
          : { targetPortType: portType }
      } else {
        // Source is right, Target is left
        updateData = isLeft 
          ? { targetPortType: portType }
          : { sourcePortType: portType }
      }

      // If a Dongle port type is selected, automatically set the opposite side to Wireless
      if (portType.code === 'Type-A (Dongle)' || portType.code === 'Type-C (Dongle)') {
        const wirelessPortType = data?.portTypes?.find(pt => pt.code === 'Wireless')
        if (wirelessPortType) {
          if (isSourceLeft) {
            updateData = isLeft 
              ? { sourcePortType: portType, targetPortType: wirelessPortType }
              : { targetPortType: portType, sourcePortType: wirelessPortType }
          } else {
            updateData = isLeft 
              ? { targetPortType: portType, sourcePortType: wirelessPortType }
              : { sourcePortType: portType, targetPortType: wirelessPortType }
          }
        }
      }

      data.onUpdate(id, updateData)
    }
    
    // Set flag to prevent context menu when closing dropdown
    document.body.setAttribute('data-dropdown-closing', 'true')
    setTimeout(() => {
      document.body.removeAttribute('data-dropdown-closing')
    }, 200)
    
    if (isLeft) {
      closeLeftDropdown()
    } else {
      closeRightDropdown()
    }
  }

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id)
    }
  }

  // Input mode - show dropdowns for port selection (only if not in viewer mode)
  if (data?.isInputMode && !data?.isCompleted && !data?.isViewerMode) {
    return (
      <>
        <BaseEdge 
          path={edgePath} 
          style={{
            stroke: '#6B7280',
            strokeWidth: 1,
            strokeDasharray: '4 4'
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              zIndex: 9999,
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
                  <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${
                    leftDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                {(leftDropdownOpen || leftClosingDropdown) && (
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[120px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-[9999] duration-200 flex flex-col ${
                    leftClosingDropdown ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                  }`}>
                    {data?.portTypes
                      ?.filter(portType => portType.code !== 'Wireless')
                      ?.sort((a, b) => {
                        const order = ['HDMI', 'DP', 'Mini DP', 'Type-C', 'Type-C (Dongle)', 'Type-A', 'Type-A (Dongle)']
                        const aIndex = order.indexOf(a.code)
                        const bIndex = order.indexOf(b.code)
                        return aIndex - bIndex
                      })
                      ?.map((portType) => (
                        <button
                          key={portType.id}
                          onClick={() => handlePortSelect(portType, true)}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 first:rounded-t-[24px] last:rounded-b-[24px]"
                        >
                          {portType.code}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              {!data?.isViewerMode && (
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center w-6 h-6 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              )}

              {/* Right Port Dropdown */}
              <div className="relative" ref={rightDropdownRef}>
                <button
                  onClick={() => setRightDropdownOpen(!rightDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[#6B7280] text-xs font-medium">
                    {rightPort?.code || 'Select'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${
                    rightDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                {(rightDropdownOpen || rightClosingDropdown) && (
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[120px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-[9999] duration-200 flex flex-col ${
                    rightClosingDropdown ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                  }`}>
                    {data?.portTypes
                      ?.filter(portType => portType.code !== 'Wireless')
                      ?.sort((a, b) => {
                        const order = ['HDMI', 'DP', 'Mini DP', 'Type-C', 'Type-C (Dongle)', 'Type-A', 'Type-A (Dongle)']
                        const aIndex = order.indexOf(a.code)
                        const bIndex = order.indexOf(b.code)
                        return aIndex - bIndex
                      })
                      ?.map((portType) => (
                        <button
                          key={portType.id}
                          onClick={() => handlePortSelect(portType, false)}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 first:rounded-t-[24px] last:rounded-b-[24px]"
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

  // Completed state - show port information (non-editable)
  const sourcePortCode = data?.sourcePortType?.code || '?'
  const targetPortCode = data?.targetPortType?.code || '?'

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={{
          stroke: '#6B7280',
          strokeWidth: 1,
          strokeDasharray: '4 4'
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            zIndex: 9999,
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-[24px] px-2 py-1 whitespace-nowrap">
            <span className="text-[#6B7280] text-xs font-medium">
              {leftPort?.code || '?'}
            </span>
            <ArrowLeftRight className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs font-medium">
              {rightPort?.code || '?'}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 
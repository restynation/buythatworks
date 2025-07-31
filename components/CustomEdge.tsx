'use client'

import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { ArrowRight } from 'lucide-react'

interface CustomEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: any
  targetPosition?: any
  data?: {
    sourcePortType?: { code: string }
    targetPortType?: { code: string }
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
              {sourcePortCode}
            </span>
            <ArrowRight className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs font-medium">
              {targetPortCode}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 
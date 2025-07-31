'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Setup, SetupBlock, SetupEdge, FlowNode, FlowEdge, Product, DeviceType, PortType } from '@/lib/types'
import { Share2, Trash2, Calendar, User, ArrowUpRight } from 'lucide-react'
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls,
  ReactFlowProvider 
} from 'reactflow'
import 'reactflow/dist/style.css'
import DeviceNode from './DeviceNode'
import CustomEdge from './CustomEdge'

const nodeTypes = {
  device: DeviceNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

interface Props {
  setupId: string
}

export default function CombinationDetail({ setupId }: Props) {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [blocks, setBlocks] = useState<SetupBlock[]>([])
  const [edges, setEdges] = useState<SetupEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [flowNodes, setFlowNodes] = useState<Node[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])

  useEffect(() => {
    loadSetupDetail()
  }, [setupId])

  useEffect(() => {
    // 스크롤 차단
    document.body.style.overflow = 'hidden'
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const loadSetupDetail = async () => {
    try {
      setLoading(true)

      // Load setup
      const { data: setupData, error: setupError } = await supabase
        .from('setups')
        .select('*')
        .eq('id', setupId)
        .is('deleted_at', null)
        .single()

      if (setupError) {
        console.error('Error loading setup:', setupError)
        return
      }

      setSetup(setupData)

      // Load blocks
      const { data: blocksData, error: blocksError } = await supabase
        .from('setup_blocks')
        .select(`
          *,
          product:products (*),
          device_type:device_types (*)
        `)
        .eq('setup_id', setupId)

      if (blocksError) {
        console.error('Error loading blocks:', blocksError)
        return
      }

      setBlocks(blocksData || [])

      // Load edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('setup_edges')
        .select(`
          *,
          source_port_type:port_types!source_port_type_id (*),
          target_port_type:port_types!target_port_type_id (*)
        `)
        .eq('setup_id', setupId)

      if (edgesError) {
        console.error('Error loading edges:', edgesError)
        return
      }

      setEdges(edgesData || [])

      // Convert to React Flow format
      convertToFlowFormat(blocksData || [], edgesData || [])
    } catch (err) {
      console.error('Failed to load setup detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const convertToFlowFormat = (blocks: SetupBlock[], edges: SetupEdge[]) => {
    // Convert blocks to FlowNodes
    const nodes: Node[] = blocks.map(block => ({
      id: block.id,
      type: 'device',
      position: { x: block.position_x, y: block.position_y },
      data: {
        blockId: block.id,
        deviceType: block.device_type!,
        product: block.product,
        customName: block.custom_name,
        products: [], // Empty for viewer mode
        onUpdate: () => {}, // No-op for viewer mode
        onDelete: () => {}, // No-op for viewer mode
        canDelete: false, // Disable delete in viewer mode
        isViewerMode: true // Disable editing
      },
      draggable: false,
      selectable: false
    }))

    // Convert edges to FlowEdges with closest handle logic
    const flowEdges: Edge[] = edges.map(edge => {
      console.log('Processing edge:', edge) // Debug log
      
      // Find the closest handles for this edge
      const sourceBlock = blocks.find(b => b.id === edge.source_block_id)
      const targetBlock = blocks.find(b => b.id === edge.target_block_id)
      
      let sourceHandle = edge.source_handle
      let targetHandle = edge.target_handle
      
      // If handle information is missing, calculate closest handles
      if (!sourceHandle || !targetHandle) {
        if (sourceBlock && targetBlock) {
          const handlePositions = {
            source: {
              left: { x: sourceBlock.position_x - 90, y: sourceBlock.position_y },
              right: { x: sourceBlock.position_x + 90, y: sourceBlock.position_y },
              top: { x: sourceBlock.position_x, y: sourceBlock.position_y - 90 },
              bottom: { x: sourceBlock.position_x, y: sourceBlock.position_y + 90 }
            },
            target: {
              left: { x: targetBlock.position_x - 90, y: targetBlock.position_y },
              right: { x: targetBlock.position_x + 90, y: targetBlock.position_y },
              top: { x: targetBlock.position_x, y: targetBlock.position_y - 90 },
              bottom: { x: targetBlock.position_x, y: targetBlock.position_y + 90 }
            }
          }
          
          // Find the closest handle pair
          let minDistance = Infinity
          let closestSourceHandle = 'left'
          let closestTargetHandle = 'left-target'
          
          const sourceHandles = ['left', 'right', 'top', 'bottom']
          const targetHandles = ['left-target', 'right-target', 'top-target', 'bottom-target']
          
          for (const sh of sourceHandles) {
            for (const th of targetHandles) {
              const sourcePos = handlePositions.source[sh as keyof typeof handlePositions.source]
              const targetPos = handlePositions.target[th.replace('-target', '') as keyof typeof handlePositions.target]
              
              const distance = Math.sqrt(
                Math.pow(sourcePos.x - targetPos.x, 2) + 
                Math.pow(sourcePos.y - targetPos.y, 2)
              )
              
              if (distance < minDistance) {
                minDistance = distance
                closestSourceHandle = sh
                closestTargetHandle = th
              }
            }
          }
          
          // Use calculated handles if original handles are missing
          if (!sourceHandle) sourceHandle = closestSourceHandle
          if (!targetHandle) targetHandle = closestTargetHandle
          
          console.log('Calculated closest handles:', {
            originalSource: edge.source_handle,
            originalTarget: edge.target_handle,
            calculatedSource: closestSourceHandle,
            calculatedTarget: closestTargetHandle,
            distance: minDistance
          })
        }
      }
      
      return {
        id: edge.id,
        source: edge.source_block_id,
        target: edge.target_block_id,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
        type: 'custom',
        data: {
          edgeId: edge.id,
          sourcePortType: edge.source_port_type!,
          targetPortType: edge.target_port_type!,
          isViewerMode: true // Disable editing
        },
        deletable: false,
        selectable: false
      }
    })

    setFlowNodes(nodes)
    setFlowEdges(flowEdges)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleDelete = async () => {
    if (!deletePin || deletePin.length !== 4) {
      alert('Please enter a 4-digit PIN')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-setup', {
        body: { setupId, pin: deletePin }
      })

      if (error) {
        alert('Invalid PIN or error deleting setup')
        return
      }

      alert('Setup deleted successfully')
      window.location.href = '/combinations'
    } catch (err) {
      console.error('Failed to delete setup:', err)
      alert('Failed to delete setup')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSeePrice = (product: Product) => {
    // TODO: Implement price lookup functionality
    console.log('See price for:', product)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Setup not found</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Left sidebar */}
      <div className="w-80 bg-[#f9f9fa] flex flex-col p-4">
        <div className="flex flex-col gap-6">
          {blocks.map(block => (
            <div key={block.id} className="flex flex-col gap-2 items-center p-2 rounded-2xl">
              <div className="flex flex-col h-[88px] items-start justify-start w-full">
                <div className="flex flex-col gap-2 grow items-center justify-center p-3 w-full">
                  <div className="aspect-[234/146] bg-[50.3%_50%] bg-no-repeat bg-size-[171.17%_126.03%] w-full rounded-lg bg-gray-200 flex items-center justify-center">
                    {block.product?.image_url ? (
                      <img 
                        src={block.product.image_url} 
                        alt={block.product.model}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs text-center">
                        {block.device_type?.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[12px] text-center text-[#15171a] leading-[16px] w-full truncate">
                  {block.product ? 
                    `${block.product.brand} ${block.product.model}` : 
                    block.custom_name
                  }
                </div>
              </div>
              <button
                onClick={() => block.product && handleSeePrice(block.product)}
                className="flex flex-row h-9 items-center justify-center px-3 py-2 rounded-xl w-full bg-white text-[14px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="leading-[20px]">See price</span>
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right graph area */}
      <div className="flex-1 bg-[#f9f9fa] rounded-[32px] overflow-hidden relative">
        {/* Top bar - Display only */}
        <div className="absolute top-2 left-2 right-2 z-50 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-[32px] border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-medium text-[#15171a] font-alpha-lyrae">
                {setup.name}
              </div>
            </div>
            <div className="flex items-center gap-2 text-base">
              <span className="text-gray-500">by</span>
              <span className="text-[#15171a] font-medium">{setup.user_name}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar - User info and actions */}
        <div className="absolute bottom-2 left-2 right-2 z-50 px-4 py-4 bg-white/90 backdrop-blur-sm rounded-[24px] border border-gray-200 shadow-sm">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <div className="text-[16px] text-gray-500 font-medium leading-[24px]">
                {setup.user_name}
              </div>
              <div className="text-[18px] text-[#15171a] leading-[28px]">
                {setup.comment || 'No comment provided'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="w-12 h-12 bg-[#f9f9fa] rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-6 h-6 text-gray-500" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-12 h-12 bg-[#f9f9fa] rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Trash2 className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <ReactFlowProvider>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnDoubleClick={false}
            deleteKeyCode={[]} // Disable delete
            defaultViewport={{ x: 0, y: 0, zoom: 1.0 }}
            minZoom={0.3}
            maxZoom={2}
            style={{ backgroundColor: '#F9F9FA' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#F9F9FA" />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Setup</h3>
            <p className="text-gray-600 mb-4">
              Enter your 4-digit PIN to delete this setup permanently.
            </p>
            
            <input
              type="password"
              maxLength={4}
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a] mb-4"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePin('')
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
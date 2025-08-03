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
import { useRouter, useSearchParams } from 'next/navigation'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [setup, setSetup] = useState<Setup | null>(null)
  const [blocks, setBlocks] = useState<SetupBlock[]>([])
  const [edges, setEdges] = useState<SetupEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [flowNodes, setFlowNodes] = useState<Node[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])

  const handleBackToList = () => {
    // 명확히 combinations 페이지로 이동
    router.push('/combinations')
  }

  useEffect(() => {
    loadSetupDetail()
  }, [setupId])

  useEffect(() => {
    // 데스크톱에서만 스크롤 차단
    const isMobile = window.innerWidth < 768
    if (!isMobile) {
      document.body.style.overflow = 'hidden'
    }
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
      
      // Calculate closest handles for this edge
      const sourceBlock = blocks.find(b => b.id === edge.source_block_id)
      const targetBlock = blocks.find(b => b.id === edge.target_block_id)
      
      let sourceHandle = 'left'
      let targetHandle = 'left-target'
      
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
        
        sourceHandle = closestSourceHandle
        targetHandle = closestTargetHandle
        
        console.log('Calculated closest handles:', {
          calculatedSource: closestSourceHandle,
          calculatedTarget: closestTargetHandle,
          distance: minDistance
        })
      }
      
      return {
        id: edge.id,
        source: edge.source_block_id,
        target: edge.target_block_id,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
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
        <svg width="595" height="90" viewBox="0 0 595 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M31.7717 88.4958H20.6157L0.0585938 24.5682H11.5906L26.131 76.0864H26.3817L39.6686 24.5682H51.0753L64.8636 76.0864H65.1143L78.4012 24.5682H89.9333L70.0029 88.4958H58.9723L45.4346 37.8552H45.1839L31.7717 88.4958Z" fill="#F3F4F5"/>
          <path d="M124.958 90C119.025 90 113.719 88.5794 109.039 85.7382C104.359 82.8969 100.724 78.9276 98.1338 73.8301C95.5432 68.7326 94.248 62.9666 94.248 56.532C94.248 50.0975 95.5432 44.3315 98.1338 39.234C100.724 34.1365 104.359 30.1671 109.039 27.3259C113.719 24.4847 119.025 23.0641 124.958 23.0641C130.975 23.0641 136.323 24.4847 141.003 27.3259C145.766 30.1671 149.485 34.1365 152.159 39.234C154.833 44.3315 156.17 50.0975 156.17 56.532C156.17 62.9666 154.833 68.7326 152.159 73.8301C149.485 78.9276 145.766 82.8969 141.003 85.7382C136.323 88.5794 130.975 90 124.958 90ZM124.958 80.5989C128.802 80.5989 132.228 79.5961 135.237 77.5905C138.245 75.5014 140.585 72.6602 142.256 69.0669C144.011 65.39 144.889 61.2117 144.889 56.532C144.889 51.9359 144.011 47.7994 142.256 44.1226C140.585 40.4457 138.245 37.6045 135.237 35.5989C132.228 33.5097 128.802 32.4652 124.958 32.4652C121.198 32.4652 117.855 33.5097 114.93 35.5989C112.006 37.6045 109.708 40.4457 108.036 44.1226C106.365 47.7994 105.529 51.9359 105.529 56.532C105.529 61.2117 106.323 65.39 107.911 69.0669C109.582 72.6602 111.88 75.5014 114.805 77.5905C117.813 79.5961 121.198 80.5989 124.958 80.5989Z" fill="#F3F4F5"/>
          <path d="M197.21 23.3148C200.72 23.3148 203.937 23.8997 206.862 25.0696L205.357 34.7214C202.6 33.3844 199.8 32.7159 196.959 32.7159C193.616 32.7159 190.608 33.844 187.934 36.1003C185.26 38.3565 183.171 41.532 181.667 45.6267C180.162 49.7214 179.41 54.4429 179.41 59.7911V88.4958H168.756V24.5682H179.034V36.6017C182.962 27.7437 189.02 23.3148 197.21 23.3148Z" fill="#F3F4F5"/>
          <path d="M227.652 56.532H238.306V67.1866H227.652V88.4958H216.997V0H227.652V56.532ZM259.616 24.5682H270.27V35.2228H259.616V24.5682ZM248.961 35.2228H259.616V45.8774H248.961V35.2228ZM238.306 56.532V45.8774H248.961V56.532H238.306ZM259.616 77.8412H248.961V56.532H259.616V77.8412ZM270.27 77.8412V88.4958H259.616V77.8412H270.27Z" fill="#F3F4F5"/>
          <path d="M307.518 90C300.499 90 294.524 88.454 289.593 85.3621C284.747 82.1866 281.446 77.5487 279.691 71.4485L289.969 67.8134C292.059 76.337 297.783 80.5989 307.142 80.5989C311.905 80.5989 315.666 79.7215 318.423 77.9666C321.265 76.1281 322.685 73.5794 322.685 70.3203C322.685 68.0641 322.017 66.3092 320.68 65.0557C319.343 63.7187 317.421 62.6741 314.914 61.922C312.407 61.1699 308.646 60.2925 303.632 59.2897C289.176 56.3649 281.947 50.39 281.947 41.3649C281.947 37.6045 283.033 34.3454 285.206 31.5877C287.462 28.8301 290.429 26.7409 294.106 25.3203C297.866 23.8162 301.919 23.0641 306.265 23.0641C312.365 23.0641 317.671 24.3593 322.184 26.9499C326.696 29.4568 329.579 32.9248 330.833 37.3538L320.805 40.4875C320.22 38.0641 318.716 36.1421 316.293 34.7214C313.869 33.2173 310.777 32.4652 307.017 32.4652C302.755 32.4652 299.371 33.2591 296.864 34.8468C294.44 36.351 293.228 38.3148 293.228 40.7382C293.228 42.5766 293.897 44.0808 295.234 45.2507C296.571 46.4206 298.493 47.4234 301 48.2591C303.591 49.0111 307.309 49.9304 312.156 51.0167C316.669 52.0195 320.429 53.1476 323.437 54.4011C326.446 55.571 328.953 57.3677 330.958 59.7911C332.964 62.2145 333.967 65.4318 333.967 69.4429C333.967 75.8774 331.543 80.9332 326.696 84.61C321.85 88.2033 315.457 90 307.518 90Z" fill="#F3F4F5"/>
          <path d="M371.705 88.4958H360.549L339.992 24.5682H351.524L366.065 76.0864H366.315L379.602 24.5682H391.009L404.797 76.0864H405.048L418.335 24.5682H429.867L409.936 88.4958H398.906L385.368 37.8552H385.117L371.705 88.4958Z" fill="#F3F4F5"/>
          <path d="M451.173 12.5348H440.518V0H451.173V12.5348ZM451.173 88.4958H440.518V24.5682H451.173V88.4958Z" fill="#F3F4F5"/>
          <path d="M486.233 24.5682H507.543V35.2228H486.233V45.8774H475.579V35.2228H464.924V24.5682H475.579V0H486.233V24.5682ZM536.874 35.2228H547.529V56.532H536.874V45.8774H526.219V0H536.874V35.2228ZM547.529 24.5682H573.1V35.2228H547.529V24.5682ZM573.1 45.8774V35.2228H583.754V45.8774H573.1ZM496.888 45.8774V56.532H486.233V45.8774H496.888ZM583.754 56.532V45.8774H594.409V56.532H583.754ZM475.579 77.8412V56.532H486.233V77.8412H475.579ZM526.219 56.532H536.874V88.4958H526.219V56.532ZM573.1 56.532H583.754V88.4958H573.1V56.532ZM507.543 88.4958H486.233V77.8412H507.543V88.4958Z" fill="#F3F4F5"/>
        </svg>
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
    <div className="p-4 bg-[#FFFFFF] min-h-screen">
      {/* Navigation 높이만큼 패딩 추가 */}
      <div className="h-32"></div>
      
      <div className="h-auto md:h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-4 overflow-hidden bg-[#FFFFFF]">
      {/* Left sidebar */}
      <div className="w-full md:w-[200px] flex flex-col order-2 md:order-1">
        {/* Back to list button */}
        <div 
          onClick={handleBackToList}
          className="flex flex-row h-12 items-center justify-center p-4 rounded-[24px] bg-[#f9f9fa] mb-4 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[16px] text-gray-500 leading-[24px]">Back to list</span>
          </div>
        </div>

        {/* Products list */}
        <div className="h-auto md:h-auto md:flex-1 overflow-y-auto bg-[#f9f9fa] rounded-[24px]">
          <div className="flex flex-col gap-0">
            {blocks
              .filter((block, index, self) => {
                // product_id가 있는 경우에만 중복 제거
                if (block.product_id) {
                  return index === self.findIndex(b => b.product_id === block.product_id)
                }
                // product_id가 없는 경우 (custom_name만 있는 경우)는 그대로 유지
                return true
              })
              .sort((a, b) => {
                // Device type별 정렬: computer, monitor, hub, mouse, keyboard
                const deviceTypeOrder: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 }
                const orderA = deviceTypeOrder[Number(a.device_type_id)] ?? 999
                const orderB = deviceTypeOrder[Number(b.device_type_id)] ?? 999
                return orderA - orderB
              })
              .map((block, index) => (
              <div key={block.id} className="flex flex-col">
                <div className="flex flex-col gap-2 items-center pt-3 px-4 pb-4">
                  <div className="flex flex-col gap-2 items-start justify-start w-full">
                    <div className="flex flex-col font-medium items-start justify-start text-left w-full">
                      <div className="overflow-hidden text-[#15171a] text-[14px] w-full leading-[20px] font-medium">
                        {block.product ? 
                          block.product.model : 
                          block.custom_name
                        }
                      </div>
                      <div className="overflow-hidden text-[12px] text-gray-500 w-full leading-[16px]">
                        {block.product?.brand || block.device_type?.name}
                      </div>
                    </div>
                    {block.product && (
                      <div 
                        onClick={() => handleSeePrice(block.product!)}
                        className="flex flex-row h-9 items-center justify-center px-3 py-2 rounded-xl w-full bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-row gap-2.5 items-center justify-center px-1.5 py-0">
                          <span className="text-[14px] text-gray-500 leading-[20px]">See price</span>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {index < blocks.length - 1 && (
                  <div className="h-px w-full bg-[#e1e3e6]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right graph area */}
      <div className="h-[480px] md:h-auto md:flex-1 bg-[#f9f9fa] rounded-[32px] overflow-hidden relative order-1 md:order-2">
        {/* Top bar - Display only */}
        <div className="absolute top-2 left-2 right-2 z-10 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-[32px] shadow-sm">
                      <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-medium text-[#15171a] font-alpha-lyrae">
                  {setup.name}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-base">
                <span className="text-gray-500">by</span>
                <span className="text-[#15171a] font-medium">{setup.user_name}</span>
              </div>
            </div>
        </div>

        {/* Bottom bar - User info and actions */}
        <div className="absolute bottom-2 left-2 right-2 z-10 px-4 py-4 bg-white/90 backdrop-blur-sm rounded-[24px] shadow-sm">
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
                className="w-12 h-12 bg-[#f9f9fa] rounded-[24px] flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-6 h-6 text-gray-500" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-12 h-12 bg-[#f9f9fa] rounded-[24px] flex items-center justify-center hover:bg-gray-100 transition-colors"
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
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnDoubleClick={false}
            deleteKeyCode={[]} // Disable delete
            defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
            minZoom={0.3}
            maxZoom={2}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 3, strokeDasharray: '5,5' }}
            defaultEdgeOptions={{
              type: 'custom',
              style: { 
                stroke: '#6B7280', 
                strokeWidth: 1,
                strokeDasharray: '4 4',
                cursor: 'pointer'
              },
              focusable: true,
              deletable: true
            }}
            style={{ backgroundColor: '#F9F9FA' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#F9F9FA" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
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
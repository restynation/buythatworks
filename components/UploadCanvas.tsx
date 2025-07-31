'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { supabase } from '@/lib/supabase'
import { DeviceType, PortType, Product } from '@/lib/types'
import DeviceNode from './DeviceNode'
import CustomEdge from './CustomEdge'
import { Plus } from 'lucide-react'

const nodeTypes = {
  device: DeviceNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

interface UploadCanvasProps {
  setupName: string
  builderName: string
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
}

function UploadCanvasInner({ setupName, builderName, nodes, edges, setNodes, setEdges }: UploadCanvasProps) {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [portTypes, setPortTypes] = useState<PortType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPosition: { x: number; y: number } } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [justFinishedConnection, setJustFinishedConnection] = useState(false)
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow()
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Outside click detection for context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Element)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [contextMenu])

  // React Flow 이벤트 핸들러 - Fixed to prevent nodes disappearing
  const onNodesChange = useCallback((changes: any) => {
    console.log('Nodes change:', changes)
    setNodes((nds: Node[]) => applyNodeChanges(changes, nds))
  }, [setNodes])

  const onEdgesChange = useCallback((changes: any) => {
    console.log('Edges change:', changes)
    setEdges((eds: Edge[]) => applyEdgeChanges(changes, eds))
  }, [setEdges])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element
      if (contextMenu && !target.closest('.context-menu')) {
        console.log('Closing context menu due to outside click')
        setContextMenu(null)
      }
    }
    
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [contextMenu])

  useEffect(() => {
    loadReferenceData()
  }, [])

  // deviceTypes가 로드된 후에 컴퓨터 초기화
  useEffect(() => {
    if (deviceTypes.length > 0 && (!nodes || nodes.length === 0)) {
      initializeWithComputer()
    }
  }, [deviceTypes, nodes?.length])

  const loadReferenceData = async () => {
    try {
      const [deviceTypesRes, portTypesRes, productsRes] = await Promise.all([
        supabase.from('device_types').select('*'),
        supabase.from('port_types').select('*'),
        supabase.from('products').select(`
          *,
          device_type:device_types (*)
        `).order('brand').order('model')
      ])

      if (deviceTypesRes.data) setDeviceTypes(deviceTypesRes.data)
      if (portTypesRes.data) setPortTypes(portTypesRes.data)
      if (productsRes.data) setProducts(productsRes.data)
    } catch (err) {
      console.error('Failed to load reference data:', err)
    }
  }

  const initializeWithComputer = () => {
    const computerType = deviceTypes.find(dt => dt.name === 'computer')
    if (!computerType) return

    const computerNode: Node = {
      id: 'computer-1',
      type: 'device',
      position: { x: 400, y: 300 },
      data: {
        deviceType: computerType,
        products: products.filter(p => p.device_type_id === computerType.id),
        onUpdate: handleNodeUpdate,
        onDelete: handleNodeDelete,
        canDelete: false
      }
    }

    setNodes([computerNode])
  }

  const handleNodeUpdate = (nodeId: string, data: any) => {
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    )
  }

  const handleNodeDelete = (nodeId: string) => {
    setNodes((nodes: Node[]) => nodes.filter((n: Node) => n.id !== nodeId))
    setEdges((edges: Edge[]) => edges.filter((e: Edge) => e.source !== nodeId && e.target !== nodeId))
  }

  const handleEdgeUpdate = (edgeId: string, data: any) => {
    setEdges((edges: Edge[]) =>
      edges.map((edge: Edge) => {
        if (edge.id === edgeId) {
          const updatedData = { ...edge.data, ...data }
          
          // Check if both ports are selected to mark as completed
          if (updatedData.sourcePortType && updatedData.targetPortType) {
            updatedData.isCompleted = true
            updatedData.isInputMode = false
          }
          
          return { ...edge, data: updatedData }
        }
        return edge
      })
    )
  }

  const handleEdgeDelete = (edgeId: string) => {
    setEdges((edges: Edge[]) => edges.filter((e: Edge) => e.id !== edgeId))
  }

  const addNewDevice = (deviceType: DeviceType, position: { x: number; y: number }) => {
    console.log('Adding new device:', deviceType.name, 'at position:', position)
    const newNode: Node = {
      id: `${deviceType.name}-${Date.now()}`,
      type: 'device',
      position,
      data: {
        deviceType,
        products: products.filter(p => p.device_type_id === deviceType.id),
        onUpdate: handleNodeUpdate,
        onDelete: handleNodeDelete,
        canDelete: true
      }
    }

    setNodes((nodes: Node[]) => [...nodes, newNode])
    setContextMenu(null)
  }

  const handlePaneClick = (event: React.MouseEvent) => {
    console.log('UploadCanvas: Pane clicked, isConnecting:', isConnecting, 'justFinishedConnection:', justFinishedConnection)
    console.log('UploadCanvas: dropdown-closing flag present:', document.body.hasAttribute('data-dropdown-closing'))
    
    // Extract values before setTimeout to avoid SyntheticEvent pooling issues
    const rect = event.currentTarget.getBoundingClientRect()
    const clientX = event.clientX - rect.left
    const clientY = event.clientY - rect.top
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY })
    
    // Prevent default to ensure we control the behavior
    event.preventDefault()
    event.stopPropagation()
    
    // Check if any nodes or edges are selected
    const currentNodes = getNodes()
    const currentEdges = getEdges()
    const hasSelectedNodes = currentNodes.some(node => node.selected)
    const hasSelectedEdges = currentEdges.some(edge => edge.selected)
    
    // Prevent context menu if any elements are selected (user is deselecting)
    if (hasSelectedNodes || hasSelectedEdges) {
      console.log('UploadCanvas: Elements are selected, preventing context menu (deselection in progress)')
      return
    }
    
    // Prevent context menu if we're in the middle of a connection or just finished one
    if (isConnecting || justFinishedConnection) {
      console.log('UploadCanvas: Currently connecting or just finished, preventing context menu')
      return
    }
    
    // Check if a dropdown is being closed (immediate check)
    if (document.body.hasAttribute('data-dropdown-closing')) {
      console.log('UploadCanvas: Dropdown is closing, preventing context menu (immediate)')
      return
    }
    
    // 기존 메뉴가 있으면 먼저 닫기
    if (contextMenu) {
      console.log('UploadCanvas: Closing existing context menu')
      setContextMenu(null)
      return
    }
    
    // Double-check after a small delay
    setTimeout(() => {
      // Re-check selected elements after delay
      const delayedNodes = getNodes()
      const delayedEdges = getEdges()
      const hasDelayedSelectedNodes = delayedNodes.some(node => node.selected)
      const hasDelayedSelectedEdges = delayedEdges.some(edge => edge.selected)
      
      if (hasDelayedSelectedNodes || hasDelayedSelectedEdges) {
        console.log('UploadCanvas: Elements still selected after delay, preventing context menu')
        return
      }
      
      if (document.body.hasAttribute('data-dropdown-closing') || isConnecting || justFinishedConnection) {
        console.log('UploadCanvas: Preventing context menu after delay check')
        return
      }
      
      // Additional check for any active dropdowns
      const activeDropdowns = document.querySelectorAll('[data-dropdown-closing], .dropdown-open, .dropdown-closing')
      if (activeDropdowns.length > 0) {
        console.log('UploadCanvas: Active dropdowns detected, preventing context menu')
        return
      }
      
      console.log('UploadCanvas: Opening context menu at:', { clientX, clientY, flowPosition })
      
      setContextMenu({
        x: clientX,
        y: clientY,
        flowPosition
      })
    }, 150)
  }

  const onConnectStart = useCallback((event: any, params: any) => {
    console.log('Connection start:', params)
    setIsConnecting(true)
  }, [])

  const onConnectEnd = useCallback((event: any) => {
    console.log('Connection end')
    setIsConnecting(false)
    setJustFinishedConnection(true)
    
    // Clear the flag after a delay to prevent context menu
    setTimeout(() => {
      setJustFinishedConnection(false)
    }, 300)
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    console.log('Connection attempt:', connection)
    setIsConnecting(false) // Ensure connecting state is reset
    
    // Validate connection
    if (!connection.source || !connection.target) {
      console.log('Invalid connection: missing source or target')
      return
    }
    
    // Prevent self-connection
    if (connection.source === connection.target) {
      console.log('Invalid connection: cannot connect to self')
      return
    }
    
    // Add edge with handle information
    const newEdge: Edge = {
      ...connection,
      id: `${connection.source}-${connection.sourceHandle || 'unknown'}-${connection.target}-${connection.targetHandle || 'unknown'}-${Date.now()}`,
      type: 'custom',
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      style: { 
        stroke: '#6B7280', 
        strokeWidth: 1,
        strokeDasharray: '4 4',
        cursor: 'pointer'
      },
      focusable: true,
      deletable: true,
      selectable: true,
      data: {
        sourcePortType: null, // No default selection
        targetPortType: null, // No default selection
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        onUpdate: handleEdgeUpdate,
        onDelete: handleEdgeDelete,
        portTypes: portTypes,
        isInputMode: true, // Automatically enter input mode
        isCompleted: false
      }
    } as Edge

    console.log('Creating edge:', newEdge)
    setEdges((edges: Edge[]) => addEdge(newEdge, edges))
  }, [portTypes])

  const availableDeviceTypes = deviceTypes.filter(dt => dt.name !== 'computer')

  return (
    <div className="h-full w-full relative z-0">
      {/* Global CSS for edge styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .react-flow__edge.selected path {
            stroke: #3b82f6 !important;
            stroke-width: 2px !important;
            stroke-dasharray: none !important;
          }
          .react-flow__edge path {
            cursor: pointer !important;
            stroke: #6B7280 !important;
            stroke-width: 1px !important;
            stroke-dasharray: 4 4 !important;
          }
          .react-flow__edge:hover path {
            stroke: #374151 !important;
          }
          .react-flow__edge {
            pointer-events: all !important;
          }
          
          /* Ensure edge dropdowns are always on top */
          .react-flow__edge .nodrag.nopan {
            z-index: 9999 !important;
          }
          
          /* Override ReactFlow's z-index for edge labels */
          .react-flow__edge .react-flow__edge-label {
            z-index: 9999 !important;
          }
          
          /* Ensure dropdowns are above all ReactFlow elements */
          .react-flow__edge [style*="z-index"] {
            z-index: 9999 !important;
          }
        `
      }} />
      
      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1.0 }}
        minZoom={0.3}
        maxZoom={2}
        connectionRadius={25}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 3, strokeDasharray: '5,5' }}
        snapToGrid={false}
        snapGrid={[15, 15]}
        deleteKeyCode={['Delete', 'Backspace']}
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
        edgesFocusable={true}
        edgesUpdatable={false}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnDoubleClick={false}
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

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu absolute z-30 w-48 bg-white rounded-[12px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y 
          }}
          onClick={(e) => e.stopPropagation()}
          ref={contextMenuRef}
        >
          <div className="p-1">
            {availableDeviceTypes.map(deviceType => (
              <button
                key={deviceType.id}
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Device type clicked:', deviceType.name, 'Position:', contextMenu.flowPosition)
                  addNewDevice(deviceType, contextMenu.flowPosition)
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  console.log('Device button mouse down:', deviceType.name)
                }}
                className="w-full text-left capitalize px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                {deviceType.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function UploadCanvas({ setupName, builderName, nodes, edges, setNodes, setEdges }: UploadCanvasProps) {
  return (
    <ReactFlowProvider>
      <UploadCanvasInner 
        setupName={setupName} 
        builderName={builderName}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
      />
    </ReactFlowProvider>
  )
} 
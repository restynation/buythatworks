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
import { Plus } from 'lucide-react'

const nodeTypes = {
  device: DeviceNode,
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
  const { screenToFlowPosition } = useReactFlow()
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
    console.log('UploadCanvas: Pane clicked, target:', (event.target as HTMLElement).className)
    console.log('UploadCanvas: dropdown-closing flag present:', document.body.hasAttribute('data-dropdown-closing'))
    
    // Extract values before setTimeout to avoid SyntheticEvent pooling issues
    const rect = event.currentTarget.getBoundingClientRect()
    const clientX = event.clientX - rect.left
    const clientY = event.clientY - rect.top
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY })
    
    // Prevent default to ensure we control the behavior
    event.preventDefault()
    event.stopPropagation()
    
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
    
    // Double-check after a small delay to catch any late-setting dropdown-closing flags
    setTimeout(() => {
      if (document.body.hasAttribute('data-dropdown-closing')) {
        console.log('UploadCanvas: Dropdown closing detected after delay, preventing context menu')
        return
      }
      
      console.log('UploadCanvas: Opening context menu at:', { clientX, clientY, flowPosition })
      
      setContextMenu({
        x: clientX,
        y: clientY,
        flowPosition
      })
    }, 50)
  }

  const onConnect = useCallback((connection: Connection) => {
    console.log('Connection attempt:', connection)
    
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
    const defaultPortType = portTypes.find(pt => pt.code === 'TYPE_C')
    if (!defaultPortType) {
      console.log('No default port type found')
      return
    }

    const newEdge: Edge = {
      ...connection,
      id: `${connection.source}-${connection.sourceHandle || 'unknown'}-${connection.target}-${connection.targetHandle || 'unknown'}-${Date.now()}`,
      type: 'default',
      label: defaultPortType.code,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      style: { 
        stroke: '#6b7280', 
        strokeWidth: 2,
        cursor: 'pointer'
      },
      labelStyle: { 
        fontSize: 10, 
        fontWeight: 500 
      },
      focusable: true,
      deletable: true,
      data: {
        sourcePortType: defaultPortType,
        targetPortType: defaultPortType,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle
      }
    } as Edge

    console.log('Creating edge:', newEdge)
    setEdges((edges: Edge[]) => addEdge(newEdge, edges))
  }, [portTypes])

  const availableDeviceTypes = deviceTypes.filter(dt => dt.name !== 'computer')

  return (
    <div className="h-full w-full relative">
      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1.0 }}
        minZoom={0.3}
        maxZoom={2}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        snapToGrid={false}
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
        edgesFocusable={true}
        edgesUpdatable={false}
        defaultEdgeOptions={{
          type: 'default',
          style: { 
            stroke: '#6b7280', 
            strokeWidth: 2,
            cursor: 'pointer'
          },
          labelStyle: { 
            fontSize: 10, 
            fontWeight: 500 
          }
        }}
        style={{ backgroundColor: '#F9F9FA' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#F9F9FA" />
      </ReactFlow>

            {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu absolute z-20 w-48 bg-white rounded-[12px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2"
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
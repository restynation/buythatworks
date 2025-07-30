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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // React Flow 이벤트 핸들러
  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds: Node[]) => {
      // React Flow의 applyNodeChanges 로직을 직접 구현
      return changes.reduce((acc: Node[], change: any) => {
        if (change.type === 'position' && change.dragging) {
          return acc.map((node: Node) => 
            node.id === change.id 
              ? { ...node, position: change.position }
              : node
          )
        }
        if (change.type === 'remove') {
          return acc.filter((node: Node) => node.id !== change.id)
        }
        return acc
      }, nds)
    })
  }, [setNodes])

  const onEdgesChange = useCallback((changes: any) => {
    setEdges((eds: Edge[]) => {
      return changes.reduce((acc: Edge[], change: any) => {
        if (change.type === 'remove') {
          return acc.filter((edge: Edge) => edge.id !== change.id)
        }
        return acc
      }, eds)
    })
  }, [setEdges])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

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

  const addNewDevice = (deviceType: DeviceType) => {
    const newNode: Node = {
      id: `${deviceType.name}-${Date.now()}`,
      type: 'device',
      position: { 
        x: Math.random() * 500 + 200, 
        y: Math.random() * 400 + 100 
      },
      data: {
        deviceType,
        products: products.filter(p => p.device_type_id === deviceType.id),
        onUpdate: handleNodeUpdate,
        onDelete: handleNodeDelete,
        canDelete: true
      }
    }

    setNodes((nodes: Node[]) => [...nodes, newNode])
  }

  const onConnect = useCallback((connection: Connection) => {
    // Add edge with default port type (TYPE_C)
    const defaultPortType = portTypes.find(pt => pt.code === 'TYPE_C')
    if (!defaultPortType) return

    const newEdge: Edge = {
      ...connection,
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      type: 'default',
      label: defaultPortType.code,
      data: {
        sourcePortType: defaultPortType,
        targetPortType: defaultPortType
      }
    } as Edge

    setEdges((edges: Edge[]) => addEdge(newEdge, edges))
  }, [portTypes])

  const availableDeviceTypes = deviceTypes.filter(dt => dt.name !== 'computer')

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-18 left-2 z-10" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-12 h-12 bg-white rounded-[24px] flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" fill="#6B7280"/>
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-[12px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-1">
              {availableDeviceTypes.map(deviceType => (
                <button
                  key={deviceType.id}
                  onClick={() => {
                    addNewDevice(deviceType)
                    setIsMenuOpen(false)
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
      
      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        style={{ backgroundColor: '#F9F9FA' }}
      >
        <Background color="#F9F9FA" />
        <Controls />
      </ReactFlow>
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
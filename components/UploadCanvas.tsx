'use client'

import React, { useEffect, useState, useCallback } from 'react'
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

function UploadCanvasInner({ setupName, builderName, nodes, edges, setNodes, setEdges }: UploadCanvasProps) {
  const [, , onNodesChange] = useNodesState([])
  const [, , onEdgesChange] = useEdgesState([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [portTypes, setPortTypes] = useState<PortType[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    loadReferenceData()
  }, [])

  // deviceTypes가 로드된 후에 컴퓨터 초기화
  useEffect(() => {
    if (deviceTypes.length > 0 && nodes.length === 0) {
      initializeWithComputer()
    }
  }, [deviceTypes, nodes.length])

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
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    )
  }

  const handleNodeDelete = (nodeId: string) => {
    setNodes(nodes => nodes.filter(n => n.id !== nodeId))
    setEdges(edges => edges.filter(e => e.source !== nodeId && e.target !== nodeId))
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

    setNodes(nodes => [...nodes, newNode])
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

    setEdges(edges => addEdge(newEdge, edges))
  }, [portTypes])

  const availableDeviceTypes = deviceTypes.filter(dt => dt.name !== 'computer')

  return (
    <div className="h-full w-full relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-[16px] shadow-lg p-4">
        <h3 className="font-semibold mb-3">Add Device</h3>
        <div className="space-y-2">
          {availableDeviceTypes.map(deviceType => (
            <button
              key={deviceType.id}
              onClick={() => addNewDevice(deviceType)}
              className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="capitalize">{deviceType.name}</span>
            </button>
          ))}
        </div>
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
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default function UploadCanvas({ setupName, builderName, deviceBlocks, setDeviceBlocks }: UploadCanvasProps) {
  return (
    <ReactFlowProvider>
      <UploadCanvasInner 
        setupName={setupName} 
        builderName={builderName}
        deviceBlocks={deviceBlocks}
        setDeviceBlocks={setDeviceBlocks}
      />
    </ReactFlowProvider>
  )
} 
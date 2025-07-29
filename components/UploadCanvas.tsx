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
import { useUploadStore } from '@/lib/stores/uploadStore'
import { DeviceType, PortType, Product } from '@/lib/types'
import DeviceNode from './DeviceNode'
import UploadModal from './UploadModal'
import { Plus } from 'lucide-react'

const nodeTypes = {
  device: DeviceNode,
}

function UploadCanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const {
    deviceTypes,
    portTypes,
    products,
    setDeviceTypes,
    setPortTypes,
    setProducts,
    validateSetup
  } = useUploadStore()

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
        `)
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

  const handleUpload = () => {
    // 현재 React Flow의 상태로 직접 검증
    const errors: string[] = []
    
    // V-01: One and only one computer block
    const computerNodes = nodes.filter(n => n.data.deviceType.name === 'computer')
    if (computerNodes.length === 0) {
      errors.push('Setup must have exactly one computer')
    } else if (computerNodes.length > 1) {
      errors.push('Setup can only have one computer')
    }
    
    // V-02: Each block has ≥1 edge
    for (const node of nodes) {
      const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id)
      if (nodeEdges.length === 0) {
        errors.push(`Device "${node.data.product?.model || node.data.customName}" must be connected`)
      }
    }
    
    // V-03: Computer/monitor blocks require product_id, others require custom_name
    for (const node of nodes) {
      const deviceType = node.data.deviceType.name
      if (['computer', 'monitor'].includes(deviceType)) {
        if (!node.data.product) {
          errors.push(`${deviceType} must have a product selected`)
        }
      } else {
        if (!node.data.customName?.trim()) {
          errors.push(`${deviceType} must have a name`)
        }
      }
    }
    
    if (errors.length > 0) {
      alert('Please fix the following issues:\n' + errors.join('\n'))
      return
    }
    
    setShowUploadModal(true)
  }

  const availableDeviceTypes = deviceTypes.filter(dt => dt.name !== 'computer')

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
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

      {/* Upload button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleUpload}
          className="btn-primary"
        >
          Upload Setup
        </button>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          nodes={nodes}
          edges={edges}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  )
}

export default function UploadCanvas() {
  return (
    <ReactFlowProvider>
      <UploadCanvasInner />
    </ReactFlowProvider>
  )
} 
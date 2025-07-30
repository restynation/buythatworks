'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Setup, SetupBlock, SetupEdge } from '@/lib/types'
import { Share2, Trash2, Calendar, User } from 'lucide-react'
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls,
  ReactFlowProvider 
} from 'reactflow'
import 'reactflow/dist/style.css'

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
    } catch (err) {
      console.error('Failed to load setup detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // Could add a toast notification here
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
      // This would call a Supabase Edge Function to verify PIN and soft-delete
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

  const convertToFlowNodes = (): Node[] => {
    return blocks.map(block => ({
      id: block.id,
      type: 'default',
      position: { x: block.position_x, y: block.position_y },
      data: {
        label: block.product ? 
          `${block.product.brand} ${block.product.model}` : 
          block.custom_name || 'Unknown Device'
      },
      draggable: false
    }))
  }

  const convertToFlowEdges = (): Edge[] => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source_block_id,
      target: edge.target_block_id,
      label: edge.source_port_type?.code || 'Unknown',
      type: 'default'
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {setup.name}
          </h1>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>{setup.user_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(setup.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              setup.is_current 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {setup.is_current ? 'Real Setup' : 'Dream Setup'}
            </span>
            
            {setup.daisy_chain && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Daisy Chain
              </span>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Comment</h3>
          <p className="text-gray-600 text-sm">
            {setup.comment || 'No comment provided'}
          </p>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Devices</h3>
          <div className="space-y-2">
            {blocks.map(block => (
              <div key={block.id} className="text-sm">
                <div className="font-medium">
                  {block.product ? 
                    `${block.product.brand} ${block.product.model}` : 
                    block.custom_name
                  }
                </div>
                <div className="text-gray-500 capitalize">
                  {block.device_type?.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 mt-auto">
          <div className="space-y-2">
            <button
              onClick={handleShare}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right graph area */}
      <div className="flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={convertToFlowNodes()}
            edges={convertToFlowEdges()}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background />
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
'use client'

import React, { useState } from 'react'
import { Node, Edge } from 'reactflow'
import { supabase } from '@/lib/supabase'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import bcrypt from 'bcryptjs'

interface Props {
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
}

export default function UploadModal({ nodes, edges, onClose }: Props) {
  const [formData, setFormData] = useState({
    setupName: '',
    userName: '',
    password: '',
    setupType: 'current' as 'current' | 'dream',
    comment: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password.length !== 4 || !/^\d{4}$/.test(formData.password)) {
      alert('Password must be exactly 4 digits')
      return
    }

    if (!formData.comment || !formData.comment.trim()) {
      alert('Comment is required')
      return
    }

    setUploading(true)

    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(formData.password, 10)

      // Upload image if provided
      let imageUrl = null
      if (image && formData.setupType === 'current') {
        console.log('📸 Uploading image...')
        const fileName = `${Date.now()}-${image.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('setup-images')
          .upload(fileName, image)

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          alert(`Image upload failed: ${uploadError.message}`)
          setUploading(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('setup-images')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
        console.log('✅ Image uploaded successfully:', imageUrl)
      }

      // Check for daisy chain (monitor-to-monitor connections)
      const hasDaisyChain = edges.some(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        return sourceNode?.data.deviceType?.name === 'monitor' && 
               targetNode?.data.deviceType?.name === 'monitor'
      })

      // Create setup via Edge Function
      console.log('🚀 Creating setup via Edge Function...')
      const setupPayload = {
        setup: {
          name: formData.setupName,
          user_name: formData.userName,
          password_hash: passwordHash,
          is_current: formData.setupType === 'current',
          comment: formData.comment || null,
          image_url: imageUrl,
          daisy_chain: hasDaisyChain
        },
        blocks: nodes.map(node => ({
          node_id: node.id, // React Flow node ID 추가
          product_id: node.data.product?.id || null,
          custom_name: node.data.customName || null,
          device_type_id: node.data.deviceType.id,
          position_x: node.position.x,
          position_y: node.position.y
        })),
        edges: edges.map(edge => ({
          source_block_id: edge.source,
          target_block_id: edge.target,
          source_port_type_id: edge.data?.sourcePortType?.id || 1,
          target_port_type_id: edge.data?.targetPortType?.id || 1
        }))
      }
      
      console.log('📦 Setup payload:', setupPayload)
      
      const { data, error } = await supabase.functions.invoke('create-setup', {
        body: setupPayload
      })

      if (error) {
        console.error('Setup creation error:', error)
        let errorMessage = 'Failed to create setup'
        
        if (error.message) {
          errorMessage += `: ${error.message}`
        }
        
        // Edge Function에서 반환된 에러 확인
        if (data && data.error) {
          errorMessage += `: ${data.error}`
        }
        
        alert(errorMessage)
        setUploading(false)
        return
      }

      if (!data || !data.setupId) {
        console.error('Invalid response from Edge Function:', data)
        alert('Setup created but received invalid response')
        setUploading(false)
        return
      }

      console.log('✅ Setup created successfully:', data.setupId)
      alert('Setup uploaded successfully!')
      window.location.href = `/combinations/${data.setupId}`
    } catch (err) {
      console.error('Upload failed:', err)
      
      let errorMessage = 'Failed to upload setup'
      
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`
      } else if (typeof err === 'string') {
        errorMessage += `: ${err}`
      } else {
        errorMessage += ': Unknown error occurred'
      }
      
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      setImage(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Upload Setup</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup Name *
            </label>
            <input
              type="text"
              required
              value={formData.setupName}
              onChange={(e) => setFormData({ ...formData, setupName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., My MacBook Pro Setup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              4-Digit Password *
            </label>
            <input
              type="password"
              required
              maxLength={4}
              pattern="\d{4}"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="1234"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used to delete your setup later
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Setup Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="setupType"
                  value="current"
                  checked={formData.setupType === 'current'}
                  onChange={(e) => setFormData({ ...formData, setupType: e.target.value as 'current' | 'dream' })}
                  className="mr-2"
                />
                <span>Current - I own this setup</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="setupType"
                  value="dream"
                  checked={formData.setupType === 'dream'}
                  onChange={(e) => setFormData({ ...formData, setupType: e.target.value as 'current' | 'dream' })}
                  className="mr-2"
                />
                <span>Dream - I want this setup</span>
              </label>
            </div>
          </div>

          {formData.setupType === 'current' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {image ? image.name : 'Click to select image'}
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Tell us about your setup... (required)"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary flex items-center justify-center space-x-2"
              disabled={uploading}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
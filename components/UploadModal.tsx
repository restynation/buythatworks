'use client'

import React, { useState } from 'react'
import { Node, Edge } from 'reactflow'
import { supabase } from '@/lib/supabase'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import bcrypt from 'bcryptjs'

interface Props {
  isOpen: boolean
  onClose: () => void
  setupName: string
  builderName: string
  nodes: Node[]
  edges: Edge[]
}

export default function UploadModal({ isOpen, onClose, setupName, builderName, nodes, edges }: Props) {
  const [formData, setFormData] = useState({
    password: '',
    setupType: 'current' as 'current' | 'dream',
    comment: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password.length !== 4 || !/^\d{4}$/.test(formData.password)) {
      alert('Password must be exactly 4 digits')
      return
    }

    if (!setupName.trim()) {
      alert('Setup name is required')
      return
    }

    if (!builderName.trim()) {
      alert('Builder name is required')
      return
    }

    if (!formData.comment.trim()) {
      alert('Comment is required')
      return
    }

    // Validation for React Flow nodes
    const computerNodes = nodes.filter(n => n.data.deviceType.name === 'computer')
    if (computerNodes.length !== 1) {
      alert('Setup must have exactly one computer')
      return
    }

    // V-02: Each block has ≥1 edge
    for (const node of nodes) {
      const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id)
      if (nodeEdges.length === 0) {
        alert(`Device "${node.data.product?.model || node.data.customName}" must be connected`)
        return
      }
    }

    // V-03: Computer/monitor blocks require product_id, others require custom_name
    for (const node of nodes) {
      const deviceType = node.data.deviceType.name
      if (['computer', 'monitor'].includes(deviceType)) {
        if (!node.data.product) {
          alert(`${deviceType} must have a product selected`)
          return
        }
      } else {
        if (!node.data.customName?.trim()) {
          alert(`${deviceType} must have a name`)
          return
        }
      }
    }

    setUploading(true)

    try {
      // 📸 이미지 업로드 (Current Setup일 때만)
      let imageUrl = null
      if (image && formData.setupType === 'current') {
        console.log('📸 Uploading image...')
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('setup-images')
          .upload(fileName, image)
        
        if (uploadError) {
          console.error('Image upload failed:', uploadError)
          alert('Failed to upload image')
          setUploading(false)
          return
        }
        
        const { data: urlData } = supabase.storage
          .from('setup-images')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
      }

      // 🔐 비밀번호 해시화
      const passwordHash = await bcrypt.hash(formData.password, 10)

      // Check for daisy chain (monitor-to-monitor connections)
      const hasDaisyChain = edges.some(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        return sourceNode?.data.deviceType?.name === 'monitor' && 
               targetNode?.data.deviceType?.name === 'monitor'
      })

      // 🏗️ Setup 생성
      const setupPayload = {
        setup: {
          name: setupName,
          user_name: builderName,
          password_hash: passwordHash,
          is_current: formData.setupType === 'current',
          comment: formData.comment,
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

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('create-setup', {
        body: setupPayload
      })

      if (error) {
        console.error('Setup creation failed:', error)
        let errorMessage = 'Failed to create setup'
        
        if (error.message?.includes('duplicate key')) {
          errorMessage = 'A setup with this name already exists'
        } else if (error.message?.includes('password')) {
          errorMessage = 'Invalid password format'
        } else if (error.message?.includes('comment')) {
          errorMessage = 'Comment is required'
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
      
    } catch (error) {
      console.error('Upload error:', error)
      
      let errorMessage = 'Failed to upload setup'
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage += `: ${error}`
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
        alert('Image must be smaller than 5MB')
        return
      }
      setImage(file)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-[32px] p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-medium text-[#15171a]" style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}>
            Share your setup
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Setup Type */}
          <div>
            <div className="space-y-4">
              <label className="flex items-start p-4 border border-gray-200 rounded-[16px] cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center h-6">
                  <input
                    type="radio"
                    name="setupType"
                    value="current"
                    checked={formData.setupType === 'current'}
                    onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                    className="w-5 h-5 text-[#15171a] border-gray-300 focus:ring-[#15171a] focus:ring-2"
                  />
                </div>
                <div className="ml-4">
                  <div className="text-base font-medium text-[#15171a]">
                    It's my current setup
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    I actually use this setup right now
                  </div>
                </div>
              </label>
              
              <label className="flex items-start p-4 border border-gray-200 rounded-[16px] cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center h-6">
                  <input
                    type="radio"
                    name="setupType"
                    value="dream"
                    checked={formData.setupType === 'dream'}
                    onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                    className="w-5 h-5 text-[#15171a] border-gray-300 focus:ring-[#15171a] focus:ring-2"
                  />
                </div>
                <div className="ml-4">
                  <div className="text-base font-medium text-[#15171a]">
                    It's my dream setup
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    I wish I had this setup someday
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Photo Upload - Only show for current setup */}
          {formData.setupType === 'current' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Photo (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-[16px] p-6 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  {image ? (
                    <p className="text-sm text-green-600 font-medium">
                      Selected: {image.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Upload a photo of your setup
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG up to 5MB
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* 4-Digit Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              4-Digit PIN
            </label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]{4}"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-4 border border-gray-300 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-transparent text-center text-xl font-mono tracking-widest"
              placeholder="••••"
              required
            />
            <p className="text-xs text-gray-500 mt-2">You'll need this PIN to edit or delete your setup</p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tell us about your setup
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              className="w-full px-4 py-4 border border-gray-300 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-transparent resize-none"
              rows={4}
              placeholder="What do you love about this setup? Any tips or advice for others?"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-[#15171a] text-white py-4 px-6 rounded-[24px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sharing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Share setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
} 
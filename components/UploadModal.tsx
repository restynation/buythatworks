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
      <div className="bg-white rounded-lg p-4 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-auto"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Select your combi's type */}
          <div className="bg-white p-4 rounded-lg w-full">
            <h2 className="text-[28px] font-medium text-[#15171a] mb-4" style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}>
              Select your combi's type
            </h2>
            <div className="flex gap-2">
              {/* It's my current setup - 280x280px card */}
              <div className="w-[280px] h-[280px] rounded-lg relative">
                <div className="p-6 h-full flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="setupType"
                      value="current"
                      checked={formData.setupType === 'current'}
                      onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                      className="w-6 h-6 text-[#15171a] border-gray-300 focus:ring-[#15171a] focus:ring-2"
                    />
                    <span className="text-[20px] leading-[28px] text-[#15171a]" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                      It's my current setup
                    </span>
                  </div>
                  
                  {/* Image Upload Area - Inside the card */}
                  <div className="flex-1 bg-white rounded-sm border border-[#e1e3e6] flex flex-col items-center justify-center p-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center cursor-pointer w-full h-full p-4"
                    >
                      <div className="w-10 h-10 mb-1 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 5V19H19V12H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H12V5H5ZM15 7V4H17V7H20V9H17V12H15V9H12V7H15Z" fill="#15171a"/>
                        </svg>
                      </div>
                      {image ? (
                        <p className="text-[14px] leading-[20px] text-center text-gray-500">
                          Selected: {image.name}
                        </p>
                      ) : (
                        <div className="text-[14px] leading-[20px] text-center text-gray-500">
                          <p>Show your image!</p>
                          <p>(Optional)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="absolute border border-[#15171a] inset-0 pointer-events-none rounded-lg" />
              </div>

              {/* It's my dream setup - 280x280px card */}
              <div className="w-[280px] h-[280px] rounded-lg relative">
                <div className="p-6 h-full flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="setupType"
                      value="dream"
                      checked={formData.setupType === 'dream'}
                      onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                      className="w-6 h-6 text-[#15171a] border-gray-300 focus:ring-[#15171a] focus:ring-2"
                    />
                    <span className="text-[20px] leading-[28px] text-[#15171a]" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                      It's my dream setup
                    </span>
                  </div>
                </div>
                <div className="absolute border border-[#e1e3e6] inset-0 pointer-events-none rounded-lg" />
              </div>
            </div>
          </div>

          {/* Leave your short comment */}
          <div className="bg-white p-4 rounded-lg w-full">
            <h3 className="text-[28px] font-medium text-[#15171a] mb-4" style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}>
              Leave your short comment
            </h3>
            <div className="bg-white h-[120px] rounded-sm border border-[#e1e3e6] relative">
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full h-full px-4 py-3 border-none outline-none resize-none text-[16px] leading-[24px] text-[#c4c7cc]"
                placeholder="MacBook is God"
                style={{ fontFamily: "'Pretendard', sans-serif" }}
                required
              />
            </div>
          </div>

          {/* 4-digit Password */}
          <div className="bg-white p-4 rounded-lg w-full flex items-center justify-between">
            <h3 className="text-[28px] font-medium text-[#15171a]" style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}>
              4-digit Password
            </h3>
            <div className="w-32">
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]{4}"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e1e3e6] rounded text-[14px] leading-[20px] text-center text-[#c4c7cc]"
                placeholder="****"
                style={{ fontFamily: "'Pretendard', sans-serif" }}
                required
              />
            </div>
          </div>

          {/* Finish Button */}
          <div className="px-6 py-4 bg-black rounded-lg w-full flex items-center justify-center">
            <button
              type="submit"
              disabled={uploading}
              className="text-white text-[20px] leading-[28px] font-normal px-3"
              style={{ fontFamily: "'Pretendard', sans-serif" }}
            >
              {uploading ? 'Uploading...' : 'Finish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
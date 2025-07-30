'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import bcrypt from 'bcryptjs'

interface DeviceBlock {
  id: string
  deviceType: { id: number; name: string }
  product?: { id: number; brand: string; model: string }
  customName?: string
  position: { x: number; y: number }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  setupName: string
  builderName: string
  deviceBlocks: DeviceBlock[]
}

export default function UploadModal({ isOpen, onClose, setupName, builderName, deviceBlocks }: Props) {
  const [formData, setFormData] = useState({
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

    // 블록 검증
    const computerBlocks = deviceBlocks.filter(b => b.deviceType.name === 'computer')
    if (computerBlocks.length !== 1) {
      alert('Setup must have exactly one computer')
      return
    }

    for (const block of deviceBlocks) {
      if (['computer', 'monitor'].includes(block.deviceType.name)) {
        if (!block.product) {
          alert(`${block.deviceType.name} must have a product selected`)
          return
        }
      } else {
        if (!block.customName?.trim()) {
          alert(`${block.deviceType.name} must have a name`)
          return
        }
      }
    }

    setUploading(true)

    try {
      // 📸 이미지 업로드
      let imageUrl = null
      if (image) {
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

      // 🏗️ Setup 생성
      const setupPayload = {
        name: setupName,
        user_name: builderName,
        password_hash: passwordHash,
        is_current: formData.setupType === 'current',
        comment: formData.comment,
        image_url: imageUrl,
        daisy_chain: false
      }

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('create-setup', {
        body: {
          setup: setupPayload,
          blocks: deviceBlocks.map(block => ({
            id: crypto.randomUUID(),
            product_id: block.product?.id || null,
            custom_name: block.customName || null,
            device_type_id: block.deviceType.id,
            position_x: block.position.x,
            position_y: block.position.y
          })),
          edges: [] // 새 디자인에서는 연결선이 없음
        }
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
        
        alert(errorMessage)
        setUploading(false)
        return
      }

      console.log('✅ Setup created successfully:', data)
      alert('Setup uploaded successfully!')
      onClose()
      
      // 폼 초기화
      setFormData({
        password: '',
        setupType: 'current',
        comment: '',
      })
      setImage(null)
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload setup. Please try again.')
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-[#15171a]" style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}>
            Upload Setup
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Setup Info Preview */}
          <div className="bg-[#f9f9fa] rounded-[16px] p-4">
            <h3 className="font-medium text-[#15171a] mb-2">Setup Preview</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Name:</span> {setupName || 'Untitled Setup'}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Builder:</span> {builderName || 'Anonymous'}
            </p>
          </div>

          {/* 4-Digit Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              4-Digit Password *
            </label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]{4}"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              placeholder="••••"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter 4 digits only</p>
          </div>

          {/* Setup Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Setup Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="setupType"
                  value="current"
                  checked={formData.setupType === 'current'}
                  onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                  className="mr-3"
                />
                <span>Current Setup (I actually use this)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="setupType"
                  value="dream"
                  checked={formData.setupType === 'dream'}
                  onChange={(e) => setFormData(prev => ({ ...prev, setupType: e.target.value as 'current' | 'dream' }))}
                  className="mr-3"
                />
                <span>Dream Setup (I wish I had this)</span>
              </label>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-[12px] p-6">
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
                  <p className="text-sm text-green-600">
                    Selected: {image.name}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Click to upload an image
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment *
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Describe your setup, why you chose these products, or any tips..."
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-[#15171a] text-white py-3 px-4 rounded-[24px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
} 
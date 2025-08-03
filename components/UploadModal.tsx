'use client'

import React, { useState } from 'react'
import { Node, Edge } from 'reactflow'
import { supabase } from '@/lib/supabase'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import bcrypt from 'bcryptjs'
import { useUploadStore } from '@/lib/stores/uploadStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  setupName: string
  builderName: string
  nodes: Node[]
  edges: Edge[]
}

export default function UploadModal({ isOpen, onClose, setupName, builderName, nodes, edges }: Props) {
  const { validateTextLengths } = useUploadStore()
  const [formData, setFormData] = useState({
    password: '',
    setupType: 'dream' as 'current' | 'dream', // 기본값을 dream으로 변경
    selectionType: 'option2' as 'option1' | 'option2', // 새로운 선택지 추가
    comment: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentFocused, setCommentFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // 컴퓨터 노드의 is_builtin_display 속성 확인
  const computerNode = nodes.find(n => n.data.deviceType.name === 'computer')
  const hasBuiltinDisplay = computerNode?.data.product?.is_builtin_display === true

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCardClick = (type: 'current' | 'dream') => {
    setFormData(prev => ({ ...prev, setupType: type }))
  }

  const handleSelectionClick = (type: 'option1' | 'option2') => {
    setFormData(prev => ({ ...prev, selectionType: type }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password.length !== 4 || !/^\d{4}$/.test(formData.password)) {
      alert('Password must be exactly 4 digits')
      return
    }

    if (!formData.comment.trim()) {
      alert('Comment is required')
      return
    }

    // Validate text lengths (including comment)
    const textValidation = validateTextLengths(setupName, builderName, formData.comment)
    if (!textValidation.isValid) {
      alert(textValidation.errors.join('\n'))
      return
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
          daisy_chain: hasDaisyChain,
          builtin_display_usage: hasBuiltinDisplay ? formData.selectionType === 'option1' : null
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
      console.log('🔍 Debug: Sending payload to Edge Function:', JSON.stringify(setupPayload, null, 2))
      
      const { data, error } = await supabase.functions.invoke('create-setup', {
        body: setupPayload
      })

      if (error) {
        console.error('Setup creation failed:', error)
        console.error('Error response data:', data)
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
          if (data.details) {
            errorMessage += ` (${data.details})`
          }
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
      <div className="box-border content-stretch flex flex-row gap-4 items-start justify-center p-0 relative rounded-[32px] w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Select your combi's type - 좌측 */}
        <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-4 items-start justify-center overflow-clip p-[16px] relative rounded-[24px] shrink-0 w-[354px] h-[609px]">
          <div className="font-['Alpha_Lyrae'] font-medium leading-[normal] not-italic relative shrink-0 text-[#15171a] text-[28px] text-left text-nowrap">
            Select your combi's type
          </div>
          <div className="box-border content-stretch flex flex-col gap-2 items-start justify-start p-0 relative shrink-0 w-full h-full flex-1">
            {/* It's my dream setup - 280x200px card (왼쪽) */}
            <div 
              className="relative rounded-[24px] shrink-0 w-full h-full flex-1 cursor-pointer"
              onClick={() => handleCardClick('dream')}
            >
              <div className="box-border content-stretch flex flex-col gap-6 items-start justify-start overflow-clip p-[24px] relative w-full h-full">
                <div className="box-border content-stretch flex flex-row gap-3 items-center justify-center p-0 relative shrink-0">
                  <div className="box-border content-stretch flex flex-row items-start justify-start p-0 relative shrink-0">
                    <input
                      type="radio"
                      name="setupType"
                      value="dream"
                      checked={formData.setupType === 'dream'}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <div className={`relative rounded-[16px] shrink-0 size-6 ${
                      formData.setupType === 'dream' 
                        ? 'bg-[#000000]' 
                        : ''
                    }`}>
                      <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-6">
                        {formData.setupType === 'dream' ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="opacity-0 relative shrink-0 size-4" />
                        )}
                      </div>
                      {formData.setupType !== 'dream' && (
                        <div className="absolute border border-[#898e99] border-solid inset-0 pointer-events-none rounded-[16px]" />
                      )}
                    </div>
                  </div>
                  <div className="font-pretendard leading-[28px] not-italic relative shrink-0 text-[#15171a] text-[20px] text-left text-nowrap">
                    It's my dream setup
                  </div>
                </div>
              </div>
              <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[24px] ${
                formData.setupType === 'dream' ? 'border-[#15171a]' : 'border-[#e1e3e6]'
              }`} />
            </div>

            {/* It's my current setup - 280x200px card (오른쪽) */}
            <div 
              className="relative rounded-[24px] shrink-0 w-full h-full flex-1 cursor-pointer"
              onClick={() => handleCardClick('current')}
            >
              <div className="box-border content-stretch flex flex-col gap-6 items-start justify-start overflow-clip p-[24px] relative w-full h-full">
                <div className="box-border content-stretch flex flex-row gap-3 items-center justify-center p-0 relative shrink-0">
                  <div className="box-border content-stretch flex flex-row items-start justify-start p-0 relative shrink-0">
                    <input
                      type="radio"
                      name="setupType"
                      value="current"
                      checked={formData.setupType === 'current'}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <div className={`relative rounded-[16px] shrink-0 size-6 ${
                      formData.setupType === 'current' 
                        ? 'bg-[#000000]' 
                        : ''
                    }`}>
                      <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-6">
                        {formData.setupType === 'current' ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="opacity-0 relative shrink-0 size-4" />
                        )}
                      </div>
                      {formData.setupType !== 'current' && (
                        <div className="absolute border border-[#898e99] border-solid inset-0 pointer-events-none rounded-[16px]" />
                      )}
                    </div>
                  </div>
                  <div className="font-pretendard leading-[28px] not-italic relative shrink-0 text-[#15171a] text-[20px] text-left text-nowrap">
                    It's my current setup
                  </div>
                </div>
                
                {/* Image Upload Area - current setup일 때만 표시 */}
                {formData.setupType === 'current' && (
                  <div className="basis-0 bg-[#ffffff] grow min-h-px min-w-px relative rounded-[12px] shrink-0 w-full h-[100px]">
                    <div className="box-border content-stretch flex flex-col gap-1 items-center justify-center overflow-clip p-0 relative size-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center cursor-pointer w-full h-full p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative shrink-0 size-10">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 5V19H19V12H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H12V5H5ZM15 7V4H17V7H20V9H17V12H15V9H12V7H15Z" fill="#15171a"/>
                          </svg>
                        </div>
                        {image ? (
                          <div className="font-pretendard leading-[20px] not-italic relative shrink-0 text-[14px] text-center text-gray-500 text-nowrap">
                            Selected: {image.name}
                          </div>
                        ) : (
                          <div className="font-pretendard leading-[20px] not-italic relative shrink-0 text-[14px] text-center text-gray-500 text-nowrap whitespace-pre">
                            <p className="block mb-0">Show your image!</p>
                            <p className="block">(Optional)</p>
                          </div>
                        )}
                      </label>
                    </div>
                    <div className="absolute border border-[#e1e3e6] border-solid inset-0 pointer-events-none rounded-[12px]" />
                  </div>
                )}
              </div>
              <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[24px] ${
                formData.setupType === 'current' ? 'border-[#15171a]' : 'border-[#e1e3e6]'
              }`} />
            </div>
          </div>
        </div>

        {/* 오른쪽 섹션들 */}
        <div className="flex flex-col gap-4 w-[526px] h-[609px]">
          {/* New Selection Area - Only show when computer has built-in display */}
          {hasBuiltinDisplay && (
            <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-4 items-start justify-start overflow-clip p-[16px] relative rounded-[24px] shrink-0 w-full">
              <div className="font-['Alpha_Lyrae'] font-medium leading-[normal] not-italic relative shrink-0 text-[#15171a] text-[28px] text-left text-nowrap">
                Is the built-in display usable?
              </div>
              <div className="flex flex-col gap-2 w-full">
                {/* Option 1 */}
                <div 
                  className="relative rounded-[24px] shrink-0 w-full cursor-pointer h-[100px]"
                  onClick={() => handleSelectionClick('option1')}
                >
                  <div className="box-border content-stretch flex flex-col gap-6 items-start justify-start overflow-clip p-[24px] relative h-full">
                    <div className="box-border content-stretch flex flex-row gap-3 items-start justify-start p-0 relative shrink-0 w-full">
                      <div className="box-border content-stretch flex flex-row items-start justify-start p-0 relative shrink-0">
                        <input
                          type="radio"
                          name="selectionType"
                          value="option1"
                          checked={formData.selectionType === 'option1'}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        <div className={`relative rounded-[16px] shrink-0 size-6 ${
                          formData.selectionType === 'option1' 
                            ? 'bg-[#000000]' 
                            : ''
                        }`}>
                          <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-6">
                            {formData.selectionType === 'option1' ? (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="opacity-0 relative shrink-0 size-4" />
                            )}
                          </div>
                          {formData.selectionType !== 'option1' && (
                            <div className="absolute border border-[#898e99] border-solid inset-0 pointer-events-none rounded-[16px]" />
                          )}
                        </div>
                      </div>
                      <div className="font-pretendard leading-[28px] not-italic relative shrink-0 text-[#15171a] text-[20px] text-left flex-1">
                        Yes, built-in and external displays work together.
                      </div>
                    </div>
                  </div>
                  <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[24px] ${
                    formData.selectionType === 'option1' ? 'border-[#15171a]' : 'border-[#e1e3e6]'
                  }`} />
                </div>

                {/* Option 2 (기본값) */}
                <div 
                  className="relative rounded-[24px] shrink-0 w-full cursor-pointer h-[100px]"
                  onClick={() => handleSelectionClick('option2')}
                >
                  <div className="box-border content-stretch flex flex-col gap-6 items-start justify-start overflow-clip p-[24px] relative h-full">
                    <div className="box-border content-stretch flex flex-row gap-3 items-start justify-start p-0 relative shrink-0 w-full">
                      <div className="box-border content-stretch flex flex-row items-start justify-start p-0 relative shrink-0">
                        <input
                          type="radio"
                          name="selectionType"
                          value="option2"
                          checked={formData.selectionType === 'option2'}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        <div className={`relative rounded-[16px] shrink-0 size-6 ${
                          formData.selectionType === 'option2' 
                            ? 'bg-[#000000]' 
                            : ''
                        }`}>
                          <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-6">
                            {formData.selectionType === 'option2' ? (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="opacity-0 relative shrink-0 size-4" />
                            )}
                          </div>
                          {formData.selectionType !== 'option2' && (
                            <div className="absolute border border-[#898e99] border-solid inset-0 pointer-events-none rounded-[16px]" />
                          )}
                        </div>
                      </div>
                      <div className="font-pretendard leading-[28px] not-italic relative shrink-0 text-[#15171a] text-[20px] text-left flex-1">
                        No, built-in display must be turned off for this combination to work.
                      </div>
                    </div>
                  </div>
                  <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[24px] ${
                    formData.selectionType === 'option2' ? 'border-[#15171a]' : 'border-[#e1e3e6]'
                  }`} />
                </div>
              </div>
            </div>
          )}

          {/* Leave your short comment */}
          <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-4 items-start justify-start overflow-clip p-[16px] relative rounded-[24px] shrink-0 w-full">
            <div className="font-['Alpha_Lyrae'] font-medium leading-[normal] not-italic relative shrink-0 text-[#15171a] text-[28px] text-left text-nowrap">
              Leave your short comment
            </div>
            <div className="bg-[#ffffff] h-[120px] relative rounded-[12px] shrink-0 w-full">
              <div className="box-border content-stretch flex flex-row h-[120px] items-center justify-start overflow-clip px-4 py-3 relative w-full">
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  onFocus={() => setCommentFocused(true)}
                  onBlur={() => setCommentFocused(false)}
                  className={`basis-0 font-pretendard grow h-full leading-[24px] min-h-px min-w-px not-italic relative shrink-0 text-[16px] text-left bg-transparent border-none outline-none resize-none ${
                    formData.comment ? 'text-[#15171a]' : 'text-[#c4c7cc]'
                  }`}
                  placeholder="MacBook is God"
                  required
                />
              </div>
              <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[12px] transition-colors ${
                commentFocused ? 'border-[#15171a]' : 'border-[#e1e3e6]'
              }`} />
            </div>
          </div>

          {/* 4-digit Password */}
          <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-4 items-start justify-start overflow-clip p-[16px] relative rounded-[24px] shrink-0 w-full">
            <div className="font-['Alpha_Lyrae'] font-medium leading-[normal] not-italic relative shrink-0 text-[#15171a] text-[28px] text-left text-nowrap">
              4-digit Password
            </div>
            <div className="bg-[#ffffff] relative rounded-[24px] shrink-0 w-full">
              <div className="box-border content-stretch flex flex-row items-center justify-start overflow-clip px-3 py-2 relative size-full">
                <input
                  type="password"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`basis-0 font-pretendard grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[14px] text-center bg-transparent border-none outline-none ${
                    formData.password ? 'text-[#15171a]' : 'text-[#c4c7cc]'
                  }`}
                  placeholder="****"
                  required
                />
              </div>
              <div className={`absolute border border-solid inset-0 pointer-events-none rounded-[24px] transition-colors ${
                passwordFocused ? 'border-[#15171a]' : 'border-[#e1e3e6]'
              }`} />
            </div>
          </div>

          {/* Finish Button */}
          <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip px-6 py-4 relative rounded-[24px] shrink-0 w-full h-[60px]">
            <div className="absolute bg-[#000000] inset-0 rounded-[24px]" />
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <div className="font-pretendard leading-[28px] not-italic relative shrink-0 text-[#ffffff] text-[20px] text-left text-nowrap">
                {uploading ? 'Uploading...' : 'Finish'}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
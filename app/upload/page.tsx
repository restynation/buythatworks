'use client'

import React, { useEffect, useState } from 'react'
import { Node, Edge } from 'reactflow'
import UploadCanvas from '@/components/UploadCanvas'
import UploadModal from '@/components/UploadModal'

export default function UploadPage() {
  const [setupName, setSetupName] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    // 스크롤 차단
    document.body.style.overflow = 'hidden'
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleUpload = () => {
    setShowUploadModal(true)
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-white">
      {/* 상단 입력 영역 */}
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Name your Combination"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="text-2xl font-medium text-[#15171a] bg-transparent border-none outline-none placeholder-gray-400"
                style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}
              />
            </div>
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Builder name"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                className="text-lg text-gray-600 bg-transparent border-none outline-none placeholder-gray-400"
              />
            </div>
          </div>
          
          <button
            onClick={handleUpload}
            className="bg-[#15171a] text-white px-6 py-3 rounded-[24px] font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            Upload
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div className="h-[calc(100%-120px)] w-full overflow-hidden">
        <UploadCanvas 
          setupName={setupName} 
          builderName={builderName}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          setupName={setupName}
          builderName={builderName}
          nodes={nodes}
          edges={edges}
        />
      )}
    </div>
  )
} 
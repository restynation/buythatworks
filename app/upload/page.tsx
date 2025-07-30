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
    <main className="p-4 bg-gray-50 min-h-screen">
      <div className="relative h-[calc(100vh-8rem)] w-full bg-white rounded-3xl overflow-hidden">
        {/* 상단 입력 영역 - 캔버스 내부에 위치 */}
        <div className="absolute top-2 left-2 right-2 z-10 p-2 bg-white/50 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <input
                type="text"
                placeholder="Name your combination"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="text-2xl font-medium text-[#15171a] bg-transparent border-none outline-none placeholder-gray-400"
                style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}
              />
              <input
                type="text"
                placeholder="Builder name"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                className="text-base text-gray-800 bg-transparent border border-gray-300 rounded-[12px] px-4 py-2 outline-none placeholder-gray-400 focus:ring-2 focus:ring-[#15171a]"
              />
            </div>
            
            <button
              onClick={handleUpload}
              className="bg-[#15171a] text-white text-base font-medium px-5 py-2 rounded-[12px] flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              Upload
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.5 12.5V13.5C17.5 14.9001 17.5 15.6002 17.2275 16.135C16.9878 16.6054 16.6054 16.9878 16.135 17.2275C15.6002 17.5 14.9001 17.5 13.5 17.5H6.5C5.09987 17.5 4.3998 17.5 3.86502 17.2275C3.39462 16.9878 3.01217 16.6054 2.77248 16.135C2.5 15.6002 2.5 14.9001 2.5 13.5V12.5M14.1667 6.66667L10 2.5M10 2.5L5.83333 6.66667M10 2.5V12.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 캔버스 영역 */}
        <UploadCanvas 
          setupName={setupName} 
          builderName={builderName}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
        />

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
    </main>
  )
} 
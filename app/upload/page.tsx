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
    <main className="p-4 bg-white min-h-screen">
      {/* 헤더 공간 */}
      <div className="h-16" />
      
      <div className="relative h-[calc(100vh-12rem)] w-full bg-white rounded-3xl overflow-hidden">
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
                className="text-base text-gray-800 bg-transparent border border-gray-300 rounded-[24px] px-4 py-2 outline-none placeholder-gray-400 focus:ring-2 focus:ring-[#15171a]"
              />
            </div>
            
            <button
              onClick={handleUpload}
              className="bg-[#15171a] text-white text-base font-medium px-5 py-2 rounded-[24px] flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              Upload
              <svg width="20" height="20" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 17H18V19H0V17ZM10 3.82843V15H8V3.82843L1.92893 9.8995L0.51472 8.4853L9 0L17.4853 8.4853L16.0711 9.8995L10 3.82843Z" fill="white"/>
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
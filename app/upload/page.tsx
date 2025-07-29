'use client'

import React, { useEffect } from 'react'
import UploadCanvas from '@/components/UploadCanvas'

export default function UploadPage() {
  useEffect(() => {
    // 스크롤 차단
    document.body.style.overflow = 'hidden'
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden">
      <UploadCanvas />
    </div>
  )
} 
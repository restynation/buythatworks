'use client'

import { useEffect } from 'react'

export default function MobileKeyboardHandler() {
  useEffect(() => {
    // 모바일 디바이스 감지
    const isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             window.innerWidth <= 768
    }

    // 현재 포커스된 요소 추적
    let focusedElement: HTMLElement | null = null
    let originalScrollY = 0

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      
      // 입력 가능한 요소인지 확인
      if (!target || !isMobile()) return
      
      const isInputElement = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.contentEditable === 'true'
      
      if (!isInputElement) return

      focusedElement = target
      originalScrollY = window.scrollY

      // 키보드가 올라오는 시간을 기다린 후 스크롤 조정
      setTimeout(() => {
        if (focusedElement && document.activeElement === focusedElement) {
          // 요소의 위치 계산
          const rect = focusedElement.getBoundingClientRect()
          const viewportHeight = window.visualViewport?.height || window.innerHeight
          const elementTop = rect.top + window.scrollY
          
          // 키보드가 올라왔을 때 요소가 화면에 보이도록 계산
          // 키보드 높이를 고려해서 요소를 화면 상단 1/3 지점에 위치시킴
          const targetPosition = elementTop - (viewportHeight * 0.3)
          
          // 부드러운 스크롤 적용
          window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
          })
        }
      }, 300) // 키보드 애니메이션 완료 대기
    }

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      
      if (!target || !isMobile()) return
      
      const isInputElement = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.contentEditable === 'true'
      
      if (!isInputElement) return

      // 키보드가 내려가는 시간을 기다린 후 원래 위치로 복원 (선택사항)
      setTimeout(() => {
        // 다른 입력 필드로 포커스가 이동하지 않았을 경우에만 복원
        const activeElement = document.activeElement as HTMLElement
        const isStillOnInput = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          activeElement.contentEditable === 'true'
        )
        
        if (!isStillOnInput) {
          // 원래 위치로 부드럽게 스크롤 (너무 급작스럽지 않게)
          const currentScroll = window.scrollY
          const diff = Math.abs(currentScroll - originalScrollY)
          
          // 스크롤 차이가 클 때만 복원 (사용자가 수동으로 스크롤했을 수도 있으므로)
          if (diff > 100) {
            window.scrollTo({
              top: originalScrollY,
              behavior: 'smooth'
            })
          }
        }
      }, 300)
      
      focusedElement = null
    }

    // iOS Safari의 경우 추가 처리
    const handleVisualViewportChange = () => {
      if (!window.visualViewport || !focusedElement || !isMobile()) return
      
      // 키보드가 올라와서 viewport 높이가 줄어들었을 때
      const heightDifference = window.innerHeight - window.visualViewport.height
      
      if (heightDifference > 150) { // 키보드가 올라온 것으로 판단
        const rect = focusedElement.getBoundingClientRect()
        const visibleTop = window.visualViewport.offsetTop || 0
        const visibleHeight = window.visualViewport.height
        
        // 입력 필드가 키보드에 가려져 있는지 확인
        if (rect.bottom > visibleHeight + visibleTop) {
          const targetScroll = window.scrollY + (rect.bottom - (visibleHeight + visibleTop)) + 20
          
          window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          })
        }
      }
    }

    // 이벤트 리스너 등록
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    
    // Visual Viewport API 지원 시 추가 처리 (iOS Safari 등)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
    }

    // 정리 함수
    return () => {
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
      }
    }
  }, [])

  // 이 컴포넌트는 UI를 렌더링하지 않음 (이벤트 핸들러만 제공)
  return null
} 
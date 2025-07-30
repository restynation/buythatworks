'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { href: '/finder', label: 'Finder', disabled: true },
    { href: '/combinations', label: 'Combinations' },
    { href: '/upload', label: 'Upload my', mobileDisabled: true },
  ]

  // 모바일 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuItemClick = () => {
    setIsMobileMenuOpen(false)
  }

  const handleUploadMyMobileClick = () => {
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000) // 2초 후 툴팁 숨김
  }

  return (
    <nav className="bg-white shadow-sm relative z-50">
      {/* 데스크톱 네비게이션 */}
      <div className="hidden md:block">
        <div className="h-16 px-6 flex items-center justify-center gap-6">
          {/* 로고 */}
          <div className="flex-1 min-w-0">
            <Link href="/" className="block">
              <span 
                className="text-[24px] font-medium text-[#15171a] leading-normal font-alpha-lyrae"
              >
                workswith
              </span>
            </Link>
          </div>
          
          {/* 네비게이션 메뉴들 */}
          {navItems.map((item) => (
            <div key={item.href} className="shrink-0">
              {item.disabled ? (
                <span className="text-[16px] font-normal text-gray-500 leading-[24px] whitespace-nowrap cursor-not-allowed">
                  {item.label}
                </span>
              ) : (
                <Link 
                  href={item.href}
                  className={`text-[16px] leading-[24px] whitespace-nowrap transition-colors ${
                    pathname === item.href 
                      ? 'font-medium text-[#15171a]' 
                      : 'font-normal text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}

          {/* Contact us 버튼 */}
          <div className="flex-1 min-w-0 flex justify-end">
            <button className="h-9 px-3 py-2 bg-[#f9f9fa] rounded-[24px] flex items-center justify-center">
              <div className="px-1.5">
                <span className="text-[14px] font-normal text-[#15171a] leading-[20px] whitespace-nowrap">
                  Contact us
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      <div className="md:hidden relative" ref={mobileMenuRef}>
        {/* 모바일 헤더 - z-index 추가 */}
        <div className="h-16 px-4 flex items-center justify-between relative z-20 bg-white">
          {/* 로고 */}
          <Link href="/" className="block">
            <span 
              className="text-[24px] font-medium text-[#15171a] leading-normal font-alpha-lyrae"
            >
              workswith
            </span>
          </Link>
          
          {/* 햄버거 메뉴 버튼 */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors relative z-40"
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 relative flex flex-col justify-center items-center">
              <div className={`w-5 h-0.5 bg-[#15171a] absolute transition-all duration-300 ease-in-out ${
                isMobileMenuOpen 
                  ? 'rotate-45 translate-y-0' 
                  : '-translate-y-1.5'
              }`} />
              <div className={`w-5 h-0.5 bg-[#15171a] absolute transition-all duration-300 ease-in-out ${
                isMobileMenuOpen 
                  ? 'opacity-0 scale-0' 
                  : 'translate-y-0'
              }`} />
              <div className={`w-5 h-0.5 bg-[#15171a] absolute transition-all duration-300 ease-in-out ${
                isMobileMenuOpen 
                  ? '-rotate-45 translate-y-0' 
                  : 'translate-y-1.5'
              }`} />
            </div>
          </button>
        </div>

        {/* 모바일 확장 메뉴 - 위치 수정 */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-4 right-4 bg-white shadow-md z-30 animate-in fade-in slide-in-from-top-2 rounded-lg">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <div key={item.href} className="relative">
                  {item.disabled || item.mobileDisabled ? (
                    <div 
                      className="block px-3 py-3 text-[16px] font-normal text-gray-400 cursor-not-allowed relative"
                      onClick={item.mobileDisabled ? handleUploadMyMobileClick : undefined}
                    >
                      {item.label}
                      {item.mobileDisabled && showTooltip && (
                        <div className="absolute top-full left-3 mt-1 bg-[#15171a] text-white text-sm px-3 py-2 rounded-md whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2">
                          Available on desktop only
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-[#15171a] rotate-45"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link 
                      href={item.href}
                      onClick={handleMobileMenuItemClick}
                      className={`block px-3 py-3 text-[16px] transition-colors rounded-md ${
                        pathname === item.href 
                          ? 'font-medium text-[#15171a] bg-gray-50' 
                          : 'font-normal text-gray-700 hover:text-[#15171a] hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              
              {/* Contact us 버튼 (모바일) - border 제거 */}
              <div className="pt-3 mt-3">
                <button className="w-full h-12 px-3 py-3 bg-[#f9f9fa] rounded-[12px] flex items-center justify-center">
                  <span className="text-[16px] font-normal text-[#15171a] leading-[20px]">
                    Contact us
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모바일 메뉴 오버레이 - z-index 조정 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  )
} 
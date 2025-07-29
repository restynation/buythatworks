'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/finder', label: 'Finder', disabled: true },
    { href: '/combinations', label: 'Combinations' },
    { href: '/upload', label: 'Upload my' },
  ]

  return (
    <nav className="bg-white shadow-sm">
      <div className="h-16 px-6 flex items-center justify-center gap-6">
        {/* 로고 */}
        <div className="flex-1 min-w-0">
          <Link href="/" className="block">
            <span 
              className="text-[24px] font-medium text-[#15171a] leading-normal"
              style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}
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
    </nav>
  )
} 
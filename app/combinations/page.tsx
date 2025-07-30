'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Setup, Product, SetupBlock } from '@/lib/types'
import Link from 'next/link'

interface SetupWithBlocks extends Setup {
  setup_blocks?: (SetupBlock & {
    products?: Product
  })[]
}

export default function CombinationsPage() {
  const [setups, setSetups] = useState<SetupWithBlocks[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [onlyRealUsers, setOnlyRealUsers] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<number | 'add-more' | null>(null)
  const [closingDropdownId, setClosingDropdownId] = useState<number | 'add-more' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // 스크롤 차단
    document.body.style.overflow = 'hidden'
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // 드롭다운 닫기 함수
  const closeDropdown = () => {
    if (openDropdownId) {
      setClosingDropdownId(openDropdownId)
      setTimeout(() => {
        setOpenDropdownId(null)
        setClosingDropdownId(null)
        setSearchTerm('')
      }, 200) // 애니메이션 지속 시간과 동일
    }
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        closeDropdown()
      }
    }

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 제품들 로드
      console.log('제품 데이터 로드 시작...')
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('brand')
        .order('model')

      if (productsError) {
        console.error('제품 로드 오류:', productsError)
        throw new Error(`제품 데이터 로드 실패: ${productsError.message} (코드: ${productsError.code})`)
      }

      console.log('제품 데이터 로드 완료:', productsData?.length || 0, '개')

      // 셋업들 로드 
      console.log('셋업 데이터 로드 시작...')
      const { data: setupsData, error: setupsError } = await supabase
        .from('setups')
        .select(`
          *,
          setup_blocks (
            id,
            product_id,
            products (*)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (setupsError) {
        console.error('셋업 로드 오류:', setupsError)
        throw new Error(`셋업 데이터 로드 실패: ${setupsError.message} (코드: ${setupsError.code})`)
      }

      console.log('셋업 데이터 로드 완료:', setupsData?.length || 0, '개')

      setProducts(productsData || [])
      setSetups(setupsData || [])
    } catch (err: any) {
      console.error('데이터 로드 오류:', err)
      
      // 더 구체적인 에러 메시지 설정
      if (err.message?.includes('제품 데이터 로드 실패')) {
        setError(`제품 목록을 불러올 수 없습니다. ${err.message}`)
      } else if (err.message?.includes('셋업 데이터 로드 실패')) {
        setError(`셋업 목록을 불러올 수 없습니다. ${err.message}`)
      } else if (err.code === 'PGRST116') {
        setError('데이터베이스 테이블을 찾을 수 없습니다. 관리자에게 문의하세요.')
      } else if (err.code === '42P01') {
        setError('데이터베이스 스키마에 문제가 있습니다. 관리자에게 문의하세요.')
      } else if (err.message?.includes('JWT')) {
        setError('인증에 문제가 있습니다. 페이지를 새로고침해주세요.')
      } else if (err.message?.includes('Network')) {
        setError('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.')
      } else {
        setError(`데이터를 불러오는 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductSelect = (product: Product) => {
    if (typeof openDropdownId === 'number') {
      // 기존 제품을 새 제품으로 교체
      setSelectedProducts(selectedProducts.map(p => 
        p.id === openDropdownId ? product : p
      ))
    } else {
      // 새 제품 추가
      if (!selectedProducts.find(p => p.id === product.id)) {
        setSelectedProducts([...selectedProducts, product])
      }
    }
    closeDropdown()
  }

  const toggleDropdown = (id: number | 'add-more') => {
    if (openDropdownId === id) {
      closeDropdown()
    } else {
      setOpenDropdownId(id)
      setClosingDropdownId(null)
      setSearchTerm('') // 드롭다운 열기 시 검색어 초기화
    }
  }

  const handleProductRemove = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId))
  }

  const filteredSetups = setups.filter(setup => {
    // 선택된 제품들로 필터링
    if (selectedProducts.length > 0) {
      const setupProductIds = setup.setup_blocks?.map(block => block.product_id) || []
      const hasAllSelectedProducts = selectedProducts.every(product => 
        setupProductIds.includes(product.id)
      )
      if (!hasAllSelectedProducts) return false
    }

    // 실제 사용자 설정만 보기 필터
    if (onlyRealUsers && !setup.is_current) {
      return false
    }

    return true
  })

  const getAvailableProducts = (forProductId?: number) => {
    const filteredProducts = products.filter(product => {
      if (forProductId) {
        // 편집 모드일 때는 현재 편집 중인 제품을 제외하고 모든 제품 표시
        return !selectedProducts.find(p => p.id === product.id && p.id !== forProductId)
      }
      // 일반 모드일 때는 선택되지 않은 제품만 표시
      return !selectedProducts.find(p => p.id === product.id)
    })

    // 검색어로 필터링
    if (searchTerm) {
      return filteredProducts.filter(product => 
        `${product.brand} ${product.model}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filteredProducts
  }



  if (error) {
    return (
      <div className="bg-white h-[calc(100vh-4rem)] px-4 py-4 overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white h-[calc(100vh-4rem)] p-4 overflow-y-auto">
      {/* 헤더 공간 */}
      <div className="h-16" />
      
             {/* 필터 섹션 */}
       <div className="bg-white rounded-[32px] p-0 mb-4">
         <div className="flex gap-2 flex-wrap">
           {/* 선택된 필터들 */}
           {selectedProducts.map((product) => (
             <div key={product.id} className="group relative bg-white border border-[#e1e3e6] rounded-[24px] w-[180px] h-[180px] p-2">
               {/* 호버 시 삭제 버튼 */}
               <button
                 onClick={() => handleProductRemove(product.id)}
                 className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-1 shadow-md hover:shadow-lg"
               >
                 <svg className="w-4 h-4 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>

               <div className="flex flex-col h-full">
                 <div className="w-[164px] h-[124px] p-4 flex items-center justify-center">
                   {product.image_url ? (
                     <img 
                       src={product.image_url} 
                       alt={`${product.brand} ${product.model}`}
                       className="max-w-full max-h-full object-contain"
                     />
                   ) : (
                     <div className="text-4xl flex items-center justify-center">
                       📱
                     </div>
                   )}
                 </div>
                 <div className="relative" data-dropdown>
                   <button
                     onClick={() => toggleDropdown(product.id)}
                     className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#15171a] flex items-center justify-between w-full"
                   >
                     <span className="truncate">{product.brand} {product.model}</span>
                     <svg 
                       className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                         openDropdownId === product.id ? 'rotate-180' : ''
                       }`} 
                       fill="none" 
                       stroke="currentColor" 
                       viewBox="0 0 24 24"
                     >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   </button>
                   
                   {(openDropdownId === product.id || closingDropdownId === product.id) && (
                     <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[180px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-10 duration-200 ${
                       closingDropdownId === product.id ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                     }`}>
                       {/* 검색 입력 */}
                       <div className="p-3 border-b border-gray-100">
                         <input
                           type="text"
                           placeholder="제품 검색..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           autoFocus
                         />
                       </div>
                       
                       {/* 옵션 목록 */}
                       <div 
                         className="max-h-80 overflow-y-auto scrollbar-hide" 

                       >
                         {getAvailableProducts(product.id).length > 0 ? (
                           getAvailableProducts(product.id).map((availableProduct, index) => (
                             <button
                               key={availableProduct.id}
                               onClick={() => handleProductSelect(availableProduct)}
                               className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                 index === getAvailableProducts(product.id).length - 1 ? 'rounded-b-[24px]' : ''
                               }`}
                             >
                               {availableProduct.brand} {availableProduct.model}
                             </button>
                           ))
                         ) : (
                           <div className="px-3 py-2 text-sm text-gray-500 rounded-b-[24px]">
                             {searchTerm ? 'No results found' : 'No products available'}
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           ))}

           {/* 새 필터 추가 */}
           <div className="bg-white border border-[#e1e3e6] rounded-[24px] w-[180px] h-[180px] p-2">
             <div className="flex flex-col h-full">
                             <div className="w-[164px] h-[124px] p-4 flex items-center justify-center">
                <div className="w-16 h-16 flex items-center justify-center">
                  <svg 
                    className="w-16 h-16 text-[#c4c7cc]"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
                    />
                  </svg>
                </div>
              </div>
               <div className="relative" data-dropdown>
                 <button
                   onClick={() => toggleDropdown('add-more')}
                   className="bg-[#f9f9fa] px-3 py-2 rounded-[24px] text-sm text-[#c4c7cc] w-full flex items-center justify-between"
                 >
                   <span>Add filter</span>
                   <svg 
                     className={`w-4 h-4 transition-transform duration-200 ${
                       openDropdownId === 'add-more' ? 'rotate-180' : ''
                     }`} 
                     fill="none" 
                     stroke="currentColor" 
                     viewBox="0 0 24 24"
                   >
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>
                 
                 {(openDropdownId === 'add-more' || closingDropdownId === 'add-more') && (
                   <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[180px] bg-white border border-[#e1e3e6] rounded-[24px] shadow-lg z-10 duration-200 ${
                     closingDropdownId === 'add-more' ? 'animate-out fade-out slide-out-to-top-2' : 'animate-in fade-in slide-in-from-top-2'
                   }`}>
                     {/* 검색 입력 */}
                     <div className="p-3 border-b border-gray-100">
                       <input
                         type="text"
                         placeholder="제품 검색..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         autoFocus
                       />
                     </div>
                     
                     {/* 옵션 목록 */}
                     <div 
                       className="max-h-80 overflow-y-auto scrollbar-hide" 

                     >
                       {getAvailableProducts().length > 0 ? (
                         getAvailableProducts().map((product, index) => (
                           <button
                             key={product.id}
                             onClick={() => handleProductSelect(product)}
                             className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                               index === getAvailableProducts().length - 1 ? 'rounded-b-[24px]' : ''
                             }`}
                           >
                             {product.brand} {product.model}
                           </button>
                         ))
                       ) : (
                         <div className="px-3 py-2 text-sm text-gray-500 rounded-b-[24px]">
                           {searchTerm ? 'No results found' : 'All products selected'}
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       </div>

             {/* 체크박스 섹션 */}
       <div className="bg-white rounded-[32px] p-0 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={onlyRealUsers}
              onChange={(e) => setOnlyRealUsers(e.target.checked)}
              className="sr-only"
            />
                         <div className={`w-6 h-6 rounded-[12px] border-2 flex items-center justify-center ${
               onlyRealUsers 
                 ? 'bg-black border-black' 
                 : 'bg-white border-[#e1e3e6]'
             }`}>
              {onlyRealUsers && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-[#15171a]">See only real users' setups</span>
        </label>
      </div>

             {/* 결과 그리드 */}
       <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(700px, 1fr))' }}>
                 {isLoading ? (
          // 간단한 로딩 스켈레톤
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-[32px] skeleton-shimmer"></div>
          ))
        ) : (
           filteredSetups.map((setup) => {
             // 제품별로 그룹화
             const productGroups = setup.setup_blocks?.reduce((groups: Record<string, any[]>, block) => {
               const productId = block.product_id?.toString() || 'unknown'
               if (!groups[productId]) {
                 groups[productId] = []
               }
               groups[productId].push(block)
               return groups
             }, {}) || {}

             const uniqueProducts = Object.values(productGroups).map(blocks => blocks[0]?.products).filter(Boolean)

             return (
               <Link key={setup.id} href={`/combinations/${setup.id}`}>
                 <div className="h-80 bg-[#f9f9fa] rounded-[32px] p-6 cursor-pointer hover:bg-white hover:border hover:border-[#e1e3e6] transition-all group">
                  <div className="h-full flex flex-col gap-20">
                    {/* 헤더 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 
                          className="text-2xl font-medium text-[#15171a] mb-1 leading-normal"
                          style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}
                        >
                          {setup.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {setup.is_current ? "Real user's setup" : "Dream setup"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-base">by</span>
                        <span 
                          className="text-lg text-[#15171a] leading-normal"
                          style={{ fontFamily: "'Alpha Lyrae', sans-serif" }}
                        >
                          {setup.user_name}
                        </span>
                      </div>
                    </div>

                                         {/* 디바이스 목록 */}
                     <div className="flex gap-2 flex-wrap">
                       {uniqueProducts.slice(0, 5).map((product, index) => (
                         <div key={product?.id || index} className="flex flex-col p-2 w-[140px] h-[140px]">
                           <div className="w-[124px] h-[108px] p-3 flex items-center justify-center">
                             {product?.image_url ? (
                               <img 
                                 src={product.image_url} 
                                 alt={`${product.brand} ${product.model}`}
                                 className="max-w-full max-h-full object-contain"
                               />
                             ) : (
                               <div className="text-4xl flex items-center justify-center">
                                 📱
                               </div>
                             )}
                           </div>
                           <p className="text-[12px] leading-[16px] text-[#15171a] text-center overflow-ellipsis overflow-hidden text-nowrap w-full font-['Pretendard'] font-normal">
                             {product ? 
                               `${product.brand} ${product.model}` : 
                               'Unknown device'
                             }
                           </p>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}

                 {filteredSetups.length === 0 && !isLoading && (
           <div className="col-span-full flex items-center justify-center py-12">
             <div className="text-center">
               <p className="text-gray-500 text-lg mb-2">No results found</p>
               <p className="text-gray-400 text-sm">Try different filters</p>
             </div>
           </div>
         )}
      </div>
    </div>
  )
} 
'use client'

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Setup, Product, SetupBlock } from '@/lib/types'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface SetupWithBlocks extends Setup {
  setup_blocks?: (SetupBlock & {
    products?: Product
  })[]
}

// Device type에 따른 아이콘 반환 함수
const getDeviceIcon = (deviceTypeName: string) => {
  switch (deviceTypeName.toLowerCase()) {
    case 'computer':
      return '💻'
    case 'monitor':
      return '🖥️'
    case 'hub':
      return '🔌'
    case 'mouse':
      return '🖱️'
    case 'keyboard':
      return '⌨️'
    default:
      return '📱'
  }
}

function CombinationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [setups, setSetups] = useState<SetupWithBlocks[]>([])
  const [displayedSetups, setDisplayedSetups] = useState<SetupWithBlocks[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<number | 'add-more' | null>(null)
  const [closingDropdownId, setClosingDropdownId] = useState<number | 'add-more' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const ITEMS_PER_PAGE = 12

  // Intersection Observer를 위한 ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  
  // 현재 표시된 항목들을 추적하기 위한 ref
  const displayedSetupsRef = useRef<SetupWithBlocks[]>([])

  // localStorage에서 필터 상태 읽기
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [onlyRealUsers, setOnlyRealUsers] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // 클라이언트에서만 localStorage에서 상태 읽기
  useEffect(() => {
    setIsClient(true)
    
    // localStorage에서 상태 복원
    const restoreState = () => {
      const savedProducts = localStorage.getItem('combinations-selected-products')
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts)
          if (Array.isArray(parsedProducts)) {
            setSelectedProducts(parsedProducts)
          }
        } catch {
          setSelectedProducts([])
        }
      }
      
      const savedOnlyRealUsers = localStorage.getItem('combinations-only-real-users')
      if (savedOnlyRealUsers !== null) {
        setOnlyRealUsers(savedOnlyRealUsers === 'true')
      }
    }
    
    // 초기 상태 복원
    restoreState()
    
    // 페이지 포커스 시 상태 복원 (다른 페이지에서 돌아올 때)
    const handleFocus = () => {
      restoreState()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // 필터 상태가 변경될 때 localStorage에 저장
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        localStorage.setItem('combinations-selected-products', JSON.stringify(selectedProducts))
        localStorage.setItem('combinations-only-real-users', onlyRealUsers.toString())
      } catch (error) {
        console.error('localStorage 저장 실패:', error)
      }
    }
  }, [selectedProducts, onlyRealUsers, isClient])

  useEffect(() => {
    loadData()
  }, [])

  // 페이지 마운트 시 상태 복원 (다른 페이지에서 돌아올 때)
  useEffect(() => {
    if (isClient) {
      const savedProducts = localStorage.getItem('combinations-selected-products')
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts)
          if (Array.isArray(parsedProducts)) {
            setSelectedProducts(parsedProducts)
          }
        } catch {
          setSelectedProducts([])
        }
      }
      
      const savedOnlyRealUsers = localStorage.getItem('combinations-only-real-users')
      if (savedOnlyRealUsers !== null) {
        setOnlyRealUsers(savedOnlyRealUsers === 'true')
      }
    }
  }, [isClient])



  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !isClient) return

    setIsLoadingMore(true)
    
    // 필터링된 결과에서 현재 페이지에 해당하는 항목들을 가져옴
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

    // ref를 사용하여 현재 표시된 항목들의 ID를 추출하여 중복 방지
    const currentDisplayedIds = new Set(displayedSetupsRef.current.map(setup => setup.id))
    
    // 아직 표시되지 않은 항목들만 필터링
    const availableSetups = filteredSetups.filter(setup => !currentDisplayedIds.has(setup.id))
    
    const newItems = availableSetups.slice(0, ITEMS_PER_PAGE)

    if (newItems.length > 0) {
      setDisplayedSetups(prev => {
        const newDisplayedSetups = [...prev, ...newItems]
        displayedSetupsRef.current = newDisplayedSetups // ref 업데이트
        return newDisplayedSetups
      })
      setCurrentPage(prev => prev + 1)
      setHasMore(newItems.length === ITEMS_PER_PAGE && availableSetups.length > ITEMS_PER_PAGE)
    } else {
      setHasMore(false)
    }

    setIsLoadingMore(false)
  }, [setups, selectedProducts, onlyRealUsers, isClient, isLoadingMore, hasMore])

  // Intersection Observer 설정
  useEffect(() => {
    if (!isClient) return

    // 기존 observer 정리
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current = observer

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, isClient, loadMore])

  // 필터링된 결과가 변경될 때 완전히 처음부터 로드
  useEffect(() => {
    if (isClient && setups.length > 0) {
      // 기존 observer 정리 (필터 변경 시 observer 재설정)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      // 상태 완전 리셋
      setCurrentPage(0)
      setDisplayedSetups([])
      setHasMore(true)
      setIsLoadingMore(false)
      
      // 필터링된 결과 계산
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

      // 처음 12개 항목만 로드 (완전히 새로 시작)
      const initialItems = filteredSetups.slice(0, ITEMS_PER_PAGE)
      setDisplayedSetups(initialItems)
      displayedSetupsRef.current = initialItems // ref 업데이트
      setCurrentPage(1)
      setHasMore(ITEMS_PER_PAGE < filteredSetups.length)

      // 새로운 observer 설정 (다음 tick에서)
      setTimeout(() => {
        if (loadingRef.current && observerRef.current) {
          observerRef.current.observe(loadingRef.current)
        }
      }, 0)
    }
  }, [selectedProducts, onlyRealUsers, isClient, setups])

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

      // Device types 로드
      console.log('디바이스 타입 데이터 로드 시작...')
      const { data: deviceTypesData, error: deviceTypesError } = await supabase
        .from('device_types')
        .select('*')

      if (deviceTypesError) {
        console.error('디바이스 타입 로드 오류:', deviceTypesError)
        throw new Error(`디바이스 타입 데이터 로드 실패: ${deviceTypesError.message} (코드: ${deviceTypesError.code})`)
      }

      console.log('디바이스 타입 데이터 로드 완료:', deviceTypesData?.length || 0, '개')

      // 셋업들 로드 
      console.log('셋업 데이터 로드 시작...')
      const { data: setupsData, error: setupsError } = await supabase
        .from('setups')
        .select(`
          *,
          setup_blocks (
            id,
            product_id,
            custom_name,
            device_type_id,
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

      // Device type 정보를 setup_blocks에 추가
      const deviceTypeMap = new Map(deviceTypesData?.map(dt => [dt.id, dt]) || [])
      const setupsWithDeviceTypes = setupsData?.map(setup => ({
        ...setup,
        setup_blocks: setup.setup_blocks?.map((block: any) => ({
          ...block,
          device_type: deviceTypeMap.get(block.device_type_id)
        }))
      })) || []

      setProducts(productsData || [])
      setSetups(setupsWithDeviceTypes)
      
      // 데이터 로딩 완료 후 초기 데이터 로드
      if (isClient) {
        setTimeout(() => {
          loadMore()
        }, 0)
      }
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
    <div className="min-h-screen bg-[#f9f9fa]">
      {/* 상단 고정 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-[#f9f9fa] p-6 pb-4">
        {/* 헤더 공간 */}
        <div className="h-16" />
      </div>
      
      {/* 스크롤 가능한 메인 컨테이너 */}
      <div className="pt-6 px-6 min-h-screen">
        {/* 빈 영역 추가 (120px - 24px = 96px) */}
        <div className="h-24 mb-6"></div>
      
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
                     <span className="truncate">{product.model}</span>
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
                           placeholder="Search products..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a]"
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
                               {availableProduct.model}
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
                    className="w-9 h-9"
                    viewBox="0 0 18 18" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18 0V2H17L12 9.5V18H6V9.5L1 2H0V0H18ZM3.4037 2L8 8.8944V16H10V8.8944L14.5963 2H3.4037Z" fill="#C4C7CC"/>
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
                         placeholder="Search products..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#15171a] focus:border-[#15171a]"
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
                             {product.model}
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
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4 lg:gap-4">
        {isLoading ? (
          // 간단한 로딩 스켈레톤
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-[32px] skeleton-shimmer"></div>
          ))
        ) : (
           displayedSetups.map((setup) => {
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
                  <div className="flex items-start justify-between min-w-0 gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-2xl font-medium text-[#15171a] mb-1 leading-normal font-alpha-lyrae"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                      >
                        {setup.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {setup.is_current ? "Real user's setup" : "Dream setup"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 min-w-0">
                      <span className="text-base">by</span>
                      <span 
                        className="text-lg text-[#15171a] leading-normal font-alpha-lyrae"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          maxWidth: '120px'
                        }}
                      >
                        {setup.user_name}
                      </span>
                    </div>
                  </div>

                  {/* 디바이스 목록 */}
                  <div className="flex gap-2 flex-wrap">
                    {setup.setup_blocks
                      ?.sort((a: any, b: any) => {
                        // Device type별 정렬: computer, monitor, hub, mouse, keyboard
                        const deviceTypeOrder: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 }
                        const orderA = deviceTypeOrder[Number(a.device_type_id)] ?? 999
                        const orderB = deviceTypeOrder[Number(b.device_type_id)] ?? 999
                        
                        // 디버깅 로그
                        console.log(`Sorting: ${a.device_type?.name || 'unknown'} (ID: ${a.device_type_id}, Type: ${typeof a.device_type_id}, Order: ${orderA}) vs ${b.device_type?.name || 'unknown'} (ID: ${b.device_type_id}, Type: ${typeof b.device_type_id}, Order: ${orderB})`)
                        console.log(`DeviceTypeOrder keys:`, Object.keys(deviceTypeOrder))
                        
                        return orderA - orderB
                      })
                      ?.slice(0, 5)
                      .map((block: any, index: number) => {
                      
                                             // Device type에 따른 아이콘과 이름 결정
                       const getDeviceInfo = (block: any) => {
                         const deviceTypeId = block.device_type_id
                         const deviceTypeName = block.device_type?.name || 'unknown'
                         
                         if (block.custom_name) {
                           // Custom name이 있는 경우
                           return {
                             name: block.custom_name,
                             icon: getDeviceIcon(deviceTypeName),
                             isCustom: true
                           }
                         } else if (block.products) {
                           // Product가 있는 경우
                           return {
                             name: block.products.model,
                             icon: getDeviceIcon(deviceTypeName),
                             isCustom: false
                           }
                         } else {
                           // 기본값
                           return {
                             name: 'Unknown device',
                             icon: '📱',
                             isCustom: false
                           }
                         }
                       }
                      
                      const deviceInfo = getDeviceInfo(block)
                      
                      return (
                        <div key={block.id || index} className="flex flex-col p-2 w-[140px] h-[140px]">
                          <div className="w-[124px] h-[108px] p-3 flex items-center justify-center">
                            {block.products?.image_url ? (
                              <img 
                                src={block.products.image_url} 
                                alt={deviceInfo.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div className="text-4xl flex items-center justify-center">
                                {deviceInfo.icon}
                              </div>
                            )}
                          </div>
                          <p className="text-[12px] leading-[16px] text-[#15171a] text-center overflow-ellipsis overflow-hidden text-nowrap w-full font-pretendard">
                            {deviceInfo.name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )
          })
        )}

        {/* 무한 스크롤 로딩 인디케이터 */}
        {isLoadingMore && (
          <div className="col-span-full flex justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span className="text-gray-500">Loading more...</span>
            </div>
          </div>
        )}

        {/* Intersection Observer를 위한 요소 */}
        {hasMore && !isLoadingMore && (
          <div ref={loadingRef} className="col-span-full h-4"></div>
        )}
      </div>
      
      {/* 검색 결과 없음 화면 - 별도 컨테이너로 분리 */}
      {displayedSetups.length === 0 && !isLoading && (
        <div className="h-[calc(100vh-24rem)] flex items-center justify-center">
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

export default function CombinationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CombinationsPageContent />
    </Suspense>
  )
} 
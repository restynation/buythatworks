import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 환경 변수 검증 강화
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Supabase environment variables are not properly configured in production')
    throw new Error('Supabase configuration is missing')
  } else {
    console.warn('Supabase environment variables are not properly configured')
  }
}

// 안전한 기본값 설정 (개발 환경에서만)
const safeSupabaseUrl = supabaseUrl || (process.env.NODE_ENV === 'development' ? 'https://placeholder.supabase.co' : '')
const safeSupabaseAnonKey = supabaseAnonKey || (process.env.NODE_ENV === 'development' ? 'placeholder-key' : '')

// URL 형식 검증
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

if (safeSupabaseUrl && !isValidUrl(safeSupabaseUrl)) {
  console.error('Invalid Supabase URL format')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid Supabase URL configuration')
  }
}

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey) 
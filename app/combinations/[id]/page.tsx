import React from 'react'
import CombinationDetail from '@/components/CombinationDetail'

interface Props {
  params: {
    id: string
  }
}

export default function CombinationDetailPage({ params }: Props) {
  return <CombinationDetail setupId={params.id} />
} 
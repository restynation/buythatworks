'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Setup, Product, DeviceType } from '@/lib/types'
import { CalendarIcon, UserIcon } from 'lucide-react'

interface Props {
  setup: Setup & { 
    blocks?: Array<{ product?: Product; device_type?: DeviceType }> 
  }
}

export default function CombinationCard({ setup }: Props) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDeviceSummary = () => {
    if (!setup.blocks) return 'No devices'
    
    const devices = setup.blocks.reduce((acc, block) => {
      const deviceType = block.device_type?.name
      if (deviceType) {
        acc[deviceType] = (acc[deviceType] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const summary = Object.entries(devices)
      .map(([type, count]) => count > 1 ? `${count} ${type}s` : `1 ${type}`)
      .join(', ')

    return summary || 'No devices'
  }

  return (
    <Link href={`/combinations/${setup.id}`}>
      <div className="card hover:shadow-md transition-shadow p-6 cursor-pointer">
        {setup.image_url && (
          <div className="mb-4 aspect-video relative overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={setup.image_url}
              alt={setup.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {setup.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {getDeviceSummary()}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-1 min-w-0 flex-1">
              <UserIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[80px]">{setup.user_name}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(setup.created_at)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              setup.is_current 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {setup.is_current ? 'Real Setup' : 'Dream Setup'}
            </span>
            
            {setup.daisy_chain && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Daisy Chain
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
} 
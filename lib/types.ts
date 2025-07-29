export interface DeviceType {
  id: number
  name: 'computer' | 'monitor' | 'hub' | 'mouse' | 'keyboard'
}

export interface PortType {
  id: number
  code: 'TYPE_C' | 'TYPE_B' | 'HDMI' | 'DP' | 'MINIDP'
}

export interface Product {
  id: number
  device_type_id: number
  brand: string
  model: string
  image_url?: string
  is_builtin_display: boolean
  created_at: string
  device_type?: DeviceType
}

export interface Setup {
  id: string
  name: string
  user_name: string
  password_hash: string
  is_current: boolean
  comment?: string
  image_url?: string
  daisy_chain: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface SetupBlock {
  id: string
  setup_id: string
  product_id?: number
  custom_name?: string
  device_type_id: number
  position_x: number
  position_y: number
  product?: Product
  device_type?: DeviceType
}

export interface SetupEdge {
  id: string
  setup_id: string
  source_block_id: string
  target_block_id: string
  source_port_type_id: number
  target_port_type_id: number
  source_port_type?: PortType
  target_port_type?: PortType
}

export interface SetupFilter {
  setup_id: string
  product_ids: number[]
}

// React Flow types
export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    blockId: string
    deviceType: DeviceType
    product?: Product
    customName?: string
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  data: {
    edgeId: string
    sourcePortType: PortType
    targetPortType: PortType
  }
  label?: string
} 
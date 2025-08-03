import { create } from 'zustand'
import { FlowNode, FlowEdge, Product, DeviceType, PortType } from '@/lib/types'

interface UploadStore {
  nodes: FlowNode[]
  edges: FlowEdge[]
  products: Product[]
  deviceTypes: DeviceType[]
  portTypes: PortType[]
  
  // Actions
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNode['data']>) => void
  removeNode: (id: string) => void
  addEdge: (edge: FlowEdge) => void
  removeEdge: (id: string) => void
  setProducts: (products: Product[]) => void
  setDeviceTypes: (deviceTypes: DeviceType[]) => void
  setPortTypes: (portTypes: PortType[]) => void
  
  // Validation
  validateSetup: () => { isValid: boolean; errors: string[] }
  validateTextLengths: (setupName: string, userName: string, comment: string) => { isValid: boolean; errors: string[] }
  
  // Reset
  resetStore: () => void
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  nodes: [],
  edges: [],
  products: [],
  deviceTypes: [],
  portTypes: [],
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  addNode: (node) => set((state) => ({ 
    nodes: [...state.nodes, node] 
  })),
  
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(node => 
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  })),
  
  removeNode: (id) => set((state) => {
    const computerNodeCount = state.nodes.filter(n => 
      n.data.deviceType.name === 'computer'
    ).length
    
    const nodeToRemove = state.nodes.find(n => n.id === id)
    
    // Prevent removing the only computer node
    if (nodeToRemove?.data.deviceType.name === 'computer' && computerNodeCount === 1) {
      return state
    }
    
    return {
      nodes: state.nodes.filter(node => node.id !== id),
      edges: state.edges.filter(edge => 
        edge.source !== id && edge.target !== id
      )
    }
  }),
  
  addEdge: (edge) => set((state) => ({ 
    edges: [...state.edges, edge] 
  })),
  
  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter(edge => edge.id !== id)
  })),
  
  setProducts: (products) => set({ products }),
  setDeviceTypes: (deviceTypes) => set({ deviceTypes }),
  setPortTypes: (portTypes) => set({ portTypes }),
  
  validateSetup: () => {
    const { nodes, edges } = get()
    const errors: string[] = []
    
    // V-01: One and only one computer block
    const computerNodes = nodes.filter(n => n.data.deviceType.name === 'computer')
    if (computerNodes.length === 0) {
      errors.push('Setup must have exactly one computer')
    } else if (computerNodes.length > 1) {
      errors.push('Setup can only have one computer')
    }
    
    // V-02: Each block has ≥1 edge
    for (const node of nodes) {
      const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id)
      if (nodeEdges.length === 0) {
        errors.push(`Device "${node.data.product?.model || node.data.customName}" must be connected`)
      }
    }
    
    // V-03: Computer/monitor blocks require product_id, others require custom_name
    for (const node of nodes) {
      const deviceType = node.data.deviceType.name
      if (['computer', 'monitor'].includes(deviceType)) {
        if (!node.data.product) {
          errors.push(`${deviceType} must have a product selected`)
        }
      } else {
        if (!node.data.customName?.trim()) {
          errors.push(`${deviceType} must have a name`)
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  validateTextLengths: (setupName: string, userName: string, comment: string) => {
    const errors: string[] = []
    
    // Setup name validation (max 200 characters)
    if (setupName.length > 200) {
      errors.push('Setup name must be 200 characters or less')
    }
    
    // User name validation (max 100 characters)
    if (userName.length > 100) {
      errors.push('User name must be 100 characters or less')
    }
    
    // Comment validation (max 500 characters for UI consistency)
    if (comment.length > 500) {
      errors.push('Comment must be 500 characters or less')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  resetStore: () => set({
    nodes: [],
    edges: [],
    products: [],
    deviceTypes: [],
    portTypes: []
  })
})) 
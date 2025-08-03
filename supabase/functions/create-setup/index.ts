import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { setup, blocks, edges } = await req.json()

    // Validate input
    if (!setup.name || !setup.user_name || !setup.password_hash) {
      return new Response(
        JSON.stringify({ error: 'Missing required setup fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate text lengths
    if (setup.name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Setup name must be 200 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (setup.user_name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'User name must be 100 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (setup.comment && setup.comment.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Comment must be 500 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Setup must have at least one block' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count computers
    const computerBlocks = blocks.filter((block: any) => {
      // Look up device type name
      return block.device_type_id === 1 // computer ID
    })

    if (computerBlocks.length !== 1) {
      return new Response(
        JSON.stringify({ error: 'Setup must have exactly one computer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate that all blocks have required data
    console.log('🔍 Debug: Validating blocks:', JSON.stringify(blocks, null, 2))
    
    for (const block of blocks) {
      const deviceTypeId = block.device_type_id
      console.log(`🔍 Debug: Validating block with device_type_id: ${deviceTypeId}, product_id: ${block.product_id}, custom_name: ${block.custom_name}`)
      
      // Computer needs product_id
      if (deviceTypeId === 1 && !block.product_id) {
        console.log('❌ Error: Computer block missing product_id')
        return new Response(
          JSON.stringify({ error: 'Computer blocks must have a product selected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Other devices need either product_id or custom_name
      if (deviceTypeId !== 1 && !block.product_id && !block.custom_name?.trim()) {
        console.log('❌ Error: Non-computer block missing both product_id and custom_name')
        return new Response(
          JSON.stringify({ error: 'Monitor, hub, mouse, and keyboard blocks must have either a product selected or a custom name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    console.log('✅ Debug: All blocks validation passed')

    // Create setup in transaction
    const { data: setupData, error: setupError } = await supabase
      .from('setups')
      .insert([setup])
      .select('id')
      .single()

    if (setupError) {
      console.error('Setup creation error:', setupError)
      return new Response(
        JSON.stringify({ error: 'Failed to create setup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const setupId = setupData.id

    // Create blocks with setup_id
    const blocksWithSetupId = blocks.map((block: any) => ({
      ...block,
      setup_id: setupId
    }))

    const { data: blocksData, error: blocksError } = await supabase
      .from('setup_blocks')
      .insert(blocksWithSetupId)
      .select('id')

    if (blocksError) {
      console.error('Blocks creation error:', blocksError)
      // Clean up setup
      await supabase.from('setups').delete().eq('id', setupId)
      return new Response(
        JSON.stringify({ error: 'Failed to create setup blocks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create edges if provided
    if (edges && edges.length > 0) {
      const edgesWithSetupId = edges.map((edge: any) => ({
        ...edge,
        setup_id: setupId
      }))

      const { error: edgesError } = await supabase
        .from('setup_edges')
        .insert(edgesWithSetupId)

      if (edgesError) {
        console.error('Edges creation error:', edgesError)
        // Clean up setup and blocks
        await supabase.from('setups').delete().eq('id', setupId)
        return new Response(
          JSON.stringify({ error: 'Failed to create setup edges' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ setupId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 
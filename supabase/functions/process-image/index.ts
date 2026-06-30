import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const hfToken = Deno.env.get('HUGGINGFACE_TOKEN')
    if (!hfToken) throw new Error('HUGGINGFACE_TOKEN not configured')

    // Require a real signed-in user — this endpoint runs with the service-role
    // key and consumes paid HuggingFace inference, so it must not be callable
    // with just the public anon key.
    const authHeader = req.headers.get('Authorization') ?? ''
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error('No file provided')

    // Reject oversized or non-image uploads before doing any work.
    const MAX_BYTES = 15 * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'Only image files are accepted' }),
        { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: 'File too large (max 15 MB)' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fileBytes = await file.arrayBuffer()

    // Fetch prompt from app_settings
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'image_enhancement_prompt')
      .single()
    const prompt = setting?.value ??
      'professional jewellery product photo, clean white background, studio lighting, high quality'

    // Convert to base64 for HuggingFace
    const uint8 = new Uint8Array(fileBytes)
    let binary = ''
    for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i])
    const base64Image = btoa(binary)

    // Call HuggingFace instruct-pix2pix — fallback to original on any failure
    let resultBytes: ArrayBuffer = fileBytes
    let resultContentType = file.type
    try {
      const hfRes = await fetch(
        'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'X-Wait-For-Model': 'true',
          },
          body: JSON.stringify({
            inputs: base64Image,
            parameters: {
              prompt,
              num_inference_steps: 20,
              image_guidance_scale: 1.5,
            },
          }),
        }
      )
      if (hfRes.ok) {
        resultBytes = await hfRes.arrayBuffer()
        resultContentType = 'image/png'
      }
    } catch {
      // fall through — upload original
    }

    // Upload to Supabase Storage
    const ext = resultContentType === 'image/png' ? 'png' : (file.name.split('.').pop() ?? 'jpg')
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, new Uint8Array(resultBytes), { contentType: resultContentType })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('product-images').getPublicUrl(path)

    return new Response(
      JSON.stringify({ url: data.publicUrl, path }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

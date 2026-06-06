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
    const hfToken = Deno.env.get('HUGGINGFACE_TOKEN')
    if (!hfToken) throw new Error('HUGGINGFACE_TOKEN not configured')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error('No file provided')

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

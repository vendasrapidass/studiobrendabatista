import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileName, fileType, fileData } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: 'Dados do arquivo incompletos.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Tipo de arquivo inválido. Use JPG, PNG ou PDF.' });
    }

    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const ext = fileType === 'application/pdf' ? 'pdf' : fileType === 'image/png' ? 'png' : 'jpg';
    const storagePath = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}.${ext}`;

    const { error } = await supabase.storage
      .from('comprovantes')
      .upload(storagePath, buffer, { contentType: fileType, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return res.status(500).json({ error: 'Falha ao salvar o comprovante. Tente novamente.' });
    }

    const { data: urlData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(storagePath);

    return res.status(200).json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

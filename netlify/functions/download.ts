import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import ytdlp from 'yt-dlp-exec';

const handler: Handler = async (event) => {
  console.log('📥 Petición recibida para descargar video');

  try {
    const rawUrl = event.queryStringParameters?.url;
    const url = rawUrl ? decodeURIComponent(rawUrl) : undefined;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Ingresa un Link válido para continuar' }),
      };
    }

    const filename = `video_${Date.now()}.mp4`;
    const filepath = path.join('/tmp', filename); // Netlify solo permite escritura en /tmp

    console.log('📥 Descargando a:', filepath);

    const ytDlpPath = '/var/task/netlify/functions/bin/yt-dlp';
    if (!fs.existsSync(ytDlpPath)) {
      console.error('❌ yt-dlp no encontrado en la ruta:', ytDlpPath);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error interno del servidor.' }),
      };
    }

    const options: Record<string, string> = {
      output: filepath,
      format: 'best',
      execPath: ytDlpPath,
    };
    
    await ytdlp(url, options);

    const fileBuffer = fs.readFileSync(filepath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('❌ Error descargando video:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al descargar el video.' }),
    };
  }
};

export { handler };

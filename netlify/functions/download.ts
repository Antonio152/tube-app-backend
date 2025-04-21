import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

    const ytDlpPath = path.resolve(__dirname, 'bin', 'yt-dlp', 'yt-dlp');// Esto funciona desde funciones Netlify

    console.log('YT-DLP path:', ytDlpPath);
    console.log('¿Existe yt-dlp?', fs.existsSync(ytDlpPath));

    if (!fs.existsSync(ytDlpPath)) {
      console.log('❌ yt-dlp no encontrado en la ruta:', ytDlpPath);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error interno del servidor.' }),
      };
    }

    console.log('Permisos yt-dlp:', fs.statSync(ytDlpPath).mode.toString(8));
    
    await new Promise<void>((resolve, reject) => {
      const ytDlpProcess = spawn(ytDlpPath, [
        url,
        '--output',
        filepath,
        '--format',
        'best',
      ]);
    
      ytDlpProcess.stdout.on('data', (data) => console.log(`📤 stdout: ${data}`));
      ytDlpProcess.stderr.on('data', (data) => console.error(`⚠️ stderr: ${data}`));
    
      ytDlpProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });
    });
    

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

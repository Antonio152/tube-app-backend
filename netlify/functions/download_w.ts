import { Handler } from '@netlify/functions';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
/* 
  This file is for downloading videos using yt-dlp for windows

*/
const handler: Handler = async (event) => {
  const rawUrl = event.queryStringParameters?.url;
  const url = rawUrl ? decodeURIComponent(rawUrl) : undefined;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL no válida' }),
    };
  }

  const outputDir = 'tmp';
  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');

  // Asegura que la carpeta temporal exista
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('📥 Descargando video con nombre del título...');

  try {
    let actualFilePath = '';

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('yt-dlp', [url, '-o', outputTemplate, '-f', 'best']);

      const detectFilePath = (data: Buffer) => {
        const text = data.toString();
        console.log(text);
      
        // Detecta destino normal
        let match = text.match(/\[download\] Destination: (.+)/);
        if (match && match[1]) {
          actualFilePath = match[1].trim();
          return;
        }
      
        // Detecta si el archivo ya fue descargado
        match = text.match(/\[download\] (.+) has already been downloaded/);
        if (match && match[1]) {
          actualFilePath = match[1].trim();
        }
      };
      
      
      proc.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        detectFilePath(data);
      });
      
      proc.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
        detectFilePath(data);
      });
      

      proc.on('close', (code) => {
        if (code === 0 && actualFilePath) {
          resolve();
        } else {
          reject(new Error(`yt-dlp terminó con código ${code}`));
        }
      });
    });

    const buffer = fs.readFileSync(actualFilePath);
    const filename = path.basename(actualFilePath);
    console.log('📄 Archivo detectado:', actualFilePath, '------', filename);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${path.basename(actualFilePath)}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('❌ Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al descargar video' }),
    };
  }
};

export { handler };

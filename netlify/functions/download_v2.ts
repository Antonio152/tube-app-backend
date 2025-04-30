import { Handler } from '@netlify/functions';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/*
  Este archivo permite descargar videos como MP4 o extraer audio como MP3 usando yt-dlp en Windows.
*/

const handler: Handler = async (event) => {
  const rawUrl = event.queryStringParameters?.url;
  const format = event.queryStringParameters?.format || 'mp4'; // "mp4" por defecto
  const url = rawUrl ? decodeURIComponent(rawUrl) : undefined;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL no válida' }),
    };
  }

  const outputDir = '/tmp';
  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`📥 Descargando como ${format.toUpperCase()}...`);

  try {
    let actualFilePath = '';

    // Comando dinámico según formato
    const ffmpegPath = path.resolve(__dirname, 'bin/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe');
    // eslint-disable-next-line no-console
    console.log("__dirname",__dirname)
console.log('📍 FFMPEG path:', ffmpegPath, fs.existsSync(ffmpegPath));

const ytdlpArgs =
  format === 'mp3'
    ? [url, '-x', '--audio-format', 'mp3', '--ffmpeg-location', ffmpegPath, '-o', outputTemplate]
    : [url, '-f', 'best', '-o', outputTemplate, '--ffmpeg-location', ffmpegPath];


    // Si querías .mp3 pero tienes .webm, algo salió mal
    if (format === 'mp3' && path.extname(actualFilePath) !== '.mp3') {
        throw new Error('La conversión a MP3 falló. ¿Está bien configurado ffmpeg?');
      }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('yt-dlp', ytdlpArgs);

      const detectFilePath = (data: Buffer) => {
        const text = data.toString();
        console.log(text);

        let match = text.match(/\[download\] Destination: (.+)/);
        if (match && match[1]) {
          actualFilePath = match[1].trim();
          return;
        }

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
    const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';

    console.log('📄 Archivo detectado:', actualFilePath, '------', filename);
    
    

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
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
      body: JSON.stringify({ error: 'Error al descargar el archivo' }),
    };
  }
};

export { handler };

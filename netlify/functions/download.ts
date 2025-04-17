import { Handler } from '@netlify/functions';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

const handler: Handler = async (event) => {
  console.log('📥 Petición recibida para descargar video');

  try {
    const rawUrl = event.queryStringParameters?.url;
    const url = rawUrl ? decodeURIComponent(rawUrl) : undefined;
    console.log('🧩 URL recibida:', rawUrl);
    console.log('📥 URL a descargar:', url);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Ingresa un Link valido para continuar' }),
      };
    }

    const filename = `video_${Date.now()}.mp4`;
    const filepath = path.join('/tmp', filename); // Netlify permite escribir solo en /tmp

    // Ruta al binario de yt-dlp
    const ytDlpPath = path.join(__dirname, 'bin', 'yt-dlp', 'yt-dlp.py'); // yt-dlp.exe en Windows
    console.log(fs.existsSync(ytDlpPath) ? 'Archivo encontrado' : 'Archivo no encontrado');


    // Verificar si el binario tiene permisos de ejecución (solo necesario en Linux)
    try {
      fs.accessSync(ytDlpPath, fs.constants.X_OK);
      console.log("✅ Binario es ejecutable");
    } catch (err) {
      console.log("❌ Binario NO es ejecutable");
    }

    //fs.chmodSync(ytDlpPath, 0o755);

    // Ejecutar la descarga con el binario local
    //await execAsync(`${ytDlpPath} -o "${filepath}" -f best "${url}"`);
    await execAsync(`python3 ${ytDlpPath}.py ...`);

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

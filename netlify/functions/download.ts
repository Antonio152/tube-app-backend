import { Handler } from "@netlify/functions";
import ytdlp, { YtFlags } from "yt-dlp-exec";
import path from "path";

export const handler: Handler = async (event) => {
  try {
    const url = event.queryStringParameters?.url;
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No se proporcionó la URL" }),
      };
    }

    const outputPath = `/tmp/video_${Date.now()}.mp4`;
    const binaryPath = path.join(__dirname, "bin/yt-dlp/yt-dlp");

    console.log("📥 Descargando:", url);
    console.log("📥 Guardando en:", outputPath);
    console.log("📦 Usando binario en:", binaryPath);

    await ytdlp(url, {
      output: outputPath,
      format: "best",
      binary: binaryPath,
    } as YtFlags); // Add 'as YtFlags' to specify the type


    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Video descargado exitosamente" }),
    };
  } catch (err) {
    console.error("❌ Error al descargar:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al descargar el video" }),
    };
  }
};

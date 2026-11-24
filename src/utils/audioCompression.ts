import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

/**
 * Audio compression utility using ffmpeg.wasm.
 * Runs instantly in the browser using WebAssembly.
 * Target default: 96kbps Opus (very high efficiency, near transparent)
 */
export async function compressAudio(
  file: File | Blob,
  targetBitrate = 96000,
  onProgress?: (progress: number) => void
): Promise<{ compressedBlob: Blob; ext: string }> {
  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      
      // Load standard single-threaded ffmpeg-core from unpkg 
      // (avoids SharedArrayBuffer CORS issues)
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
    }

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    } else {
      ffmpeg.off('progress', () => {});
    }

    const inputName = 'input.mp3'; // dummy input name
    const outputName = 'output.webm'; // WebM container for Opus

    // Write file to in-memory filesystem
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Execute ffmpeg to compress to Opus audio
    const bitrateK = Math.floor(targetBitrate / 1000) + 'k';
    
    await ffmpeg.exec([
      '-i', inputName,
      '-c:a', 'libopus',
      '-b:a', bitrateK, // 96k
      '-vbr', 'on',
      '-compression_level', '10', // max efficiency since we encode offline
      '-f', 'webm',
      outputName,
    ]);

    // Read result
    const data = await ffmpeg.readFile(outputName);
    const compressedBlob = new Blob([data as any], { type: 'audio/webm' });

    // Clean up memory
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return { compressedBlob, ext: 'webm' };
  } catch (err) {
    console.error('FFmpeg WASM compression failed:', err);
    // Silent fallback to original
    return {
      compressedBlob: file as Blob,
      ext: file instanceof File ? (file.name.split('.').pop() || 'mp3') : 'mp3',
    };
  }
}

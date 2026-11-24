import { useEffect, useState } from 'react';

const DEFAULT_ACCENT = '#8b5cf6';

const cache = new Map<string, string>();

export function extractDominantColor(imageUrl: string): Promise<string> {
  if (cache.has(imageUrl)) return Promise.resolve(cache.get(imageUrl)!);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_ACCENT);

        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Sample every 4th pixel for speed, skip very dark/light pixels
        for (let i = 0; i < imageData.length; i += 16) {
          const red = imageData[i];
          const green = imageData[i + 1];
          const blue = imageData[i + 2];
          const alpha = imageData[i + 3];

          if (alpha < 128) continue;
          if (red < 20 && green < 20 && blue < 20) continue;
          if (red > 240 && green > 240 && blue > 240) continue;

          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (count === 0) return resolve(DEFAULT_ACCENT);

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Boost saturation slightly for more vibrant accent
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max > 0) {
          const boost = 1.15;
          r = Math.min(255, Math.round(r + (r - min) * (boost - 1)));
          g = Math.min(255, Math.round(g + (g - min) * (boost - 1)));
          b = Math.min(255, Math.round(b + (b - min) * (boost - 1)));
        }

        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        cache.set(imageUrl, hex);
        resolve(hex);
      } catch {
        resolve(DEFAULT_ACCENT);
      }
    };

    img.onerror = () => resolve(DEFAULT_ACCENT);
  });
}

export const useAccentColor = (imageUrl: string | null | undefined) => {
  const [accent, setAccent] = useState<string>(() => imageUrl ? cache.get(imageUrl) || DEFAULT_ACCENT : DEFAULT_ACCENT);

  useEffect(() => {
    if (!imageUrl) {
      setAccent(DEFAULT_ACCENT);
      return;
    }

    const cached = cache.get(imageUrl);
    if (cached) {
      setAccent(cached);
      return;
    }

    let cancelled = false;
    extractDominantColor(imageUrl).then((color) => {
      if (!cancelled) setAccent(color);
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  return accent;
};

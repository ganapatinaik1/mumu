export interface ID3Data {
  title?: string;
  artist?: string;
  album?: string;
  cover?: Blob;
}

export async function parseID3(file: File): Promise<ID3Data> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return resolve({});

      const view = new DataView(buffer);
      const data: ID3Data = {};

      try {
        // Check if ID3 tag exists
        if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
          return resolve(data);
        }

        const version = view.getUint8(3);
        const flags = view.getUint8(5);
        const sizeInfo = view.getUint32(6);
        // ID3 tag size is stored in 4 bytes, using 7 bits of each byte
        const tagSize = ((sizeInfo & 0x7f000000) >> 3) |
                        ((sizeInfo & 0x007f0000) >> 2) |
                        ((sizeInfo & 0x00007f00) >> 1) |
                         (sizeInfo & 0x0000007f);

        let offset = 10;
        
        // Skip extended header if present
        if (flags & 0x40) {
          const extSize = view.getUint32(10);
          offset += extSize;
        }

        while (offset < tagSize + 10 && offset < view.byteLength) {
          if (view.getUint8(offset) === 0) break; // Padding

          let frameId = '';
          for (let i = 0; i < 4; i++) {
            frameId += String.fromCharCode(view.getUint8(offset + i));
          }
          
          let frameSize = 0;
          if (version === 3) {
             frameSize = view.getUint32(offset + 4);
          } else if (version === 4) {
             const s = view.getUint32(offset + 4);
             frameSize = ((s & 0x7f000000) >> 3) | ((s & 0x007f0000) >> 2) | ((s & 0x00007f00) >> 1) | (s & 0x0000007f);
          } else {
             break; // unsupported ID3v2 version
          }

          const frameOffset = offset + 10;

          if (frameSize > 0 && frameOffset + frameSize <= view.byteLength) {
             const encoding = view.getUint8(frameOffset);
             let text = '';
             
             if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB') {
                // Read text (basic ascii or utf16)
                if (encoding === 0 || encoding === 3) {
                   for (let i = 1; i < frameSize; i++) {
                     const char = view.getUint8(frameOffset + i);
                     if (char !== 0) text += String.fromCharCode(char);
                   }
                } else if (encoding === 1 || encoding === 2) {
                   // basic utf16 fallback (reading lower bytes)
                   for (let i = 3; i < frameSize; i += 2) {
                      const char = view.getUint8(frameOffset + i);
                      if (char !== 0) text += String.fromCharCode(char);
                   }
                }
                
                if (frameId === 'TIT2') data.title = text;
                if (frameId === 'TPE1') data.artist = text;
                if (frameId === 'TALB') data.album = text;
             }
             
             if (frameId === 'APIC') {
                // Read picture
                let p = frameOffset + 1; // skip encoding
                let mime = '';
                while (p < frameOffset + frameSize && view.getUint8(p) !== 0) {
                   mime += String.fromCharCode(view.getUint8(p));
                   p++;
                }
                p++; // skip null
                view.getUint8(p); // skip pic type
                p++; // skip pic type
                
                // skip description
                while (p < frameOffset + frameSize && view.getUint8(p) !== 0) {
                   if (encoding === 1 || encoding === 2) p += 2; else p++;
                }
                if (encoding === 1 || encoding === 2) p += 2; else p++;
                
                const picDataSize = frameSize - (p - frameOffset);
                if (picDataSize > 0) {
                   const picBuffer = buffer.slice(p, p + picDataSize);
                   data.cover = new Blob([picBuffer], { type: mime || 'image/jpeg' });
                }
             }
          }
          offset += 10 + frameSize;
        }
      } catch (e) {
        console.warn('ID3 parsing error:', e);
      }
      
      resolve(data);
    };

    // Read first chunk to avoid huge memory usage
    reader.readAsArrayBuffer(file.slice(0, 500000)); 
  });
}

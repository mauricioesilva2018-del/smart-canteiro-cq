/**
 * Utilitário para otimização e compressão de fotos capturadas na câmera/galeria.
 * Garante que fotos de smartphones (5MB-20MB) sejam redimensionadas e comprimidas
 * para caber com folga no limite de 1MB do Firestore e no IndexedDB,
 * mantendo excelente nitidez para visualização na tela e no Laudo PDF.
 */

export async function compressImageFile(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        return resolve('');
      }

      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Se a imagem já for menor que os limites e for razoavelmente pequena, use diretamente
          if (width <= maxWidth && height <= maxHeight && file.size < 400 * 1024) {
            return resolve(src);
          }

          // Redimensionamento proporcional
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(src);
          }

          // Fundo branco para garantir transparências limpas
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Converte para JPEG com compressão controlada
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Erro na compressão, usando original:', err);
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(base64: string, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> {
  if (!base64 || !base64.startsWith('data:image')) return base64;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(base64);
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width <= maxWidth && height <= maxHeight && base64.length < 500 * 1024) {
          return resolve(base64);
        }

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(base64);
      }
    };
    img.src = base64;
  });
}

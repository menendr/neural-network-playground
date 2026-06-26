export type PreprocessResult = {
  cropDataUrl: string;
  grayscaleDataUrl: string;
  tensor: number[];
};

const INPUT_SIZE = 28;

export function preprocessCanvas(source: HTMLCanvasElement): PreprocessResult {
  const bounds = getInkBounds(source);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = 112;
  cropCanvas.height = 112;
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });

  if (!cropCtx || !bounds) {
    return {
      cropDataUrl: emptyPreview(112),
      grayscaleDataUrl: emptyPreview(INPUT_SIZE),
      tensor: Array(INPUT_SIZE * INPUT_SIZE).fill(0)
    };
  }

  cropCtx.fillStyle = "#ffffff";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  const padding = Math.max(bounds.width, bounds.height) * 0.22;
  const size = Math.max(bounds.width, bounds.height) + padding * 2;
  const sx = bounds.centerX - size / 2;
  const sy = bounds.centerY - size / 2;
  cropCtx.drawImage(source, sx, sy, size, size, 0, 0, cropCanvas.width, cropCanvas.height);

  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = INPUT_SIZE;
  smallCanvas.height = INPUT_SIZE;
  const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
  if (!smallCtx) {
    return {
      cropDataUrl: cropCanvas.toDataURL(),
      grayscaleDataUrl: emptyPreview(INPUT_SIZE),
      tensor: Array(INPUT_SIZE * INPUT_SIZE).fill(0)
    };
  }

  smallCtx.fillStyle = "#ffffff";
  smallCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  smallCtx.drawImage(cropCanvas, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const pixels = smallCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const tensor: number[] = [];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    tensor.push(Number(((255 - luminance) / 255).toFixed(4)));
  }

  return {
    cropDataUrl: cropCanvas.toDataURL(),
    grayscaleDataUrl: smallCanvas.toDataURL(),
    tensor
  };
}

function getInkBounds(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 245 || data[idx + 1] < 245 || data[idx + 2] < 245) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        found = true;
      }
    }
  }

  if (!found) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function emptyPreview(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }
  return canvas.toDataURL();
}

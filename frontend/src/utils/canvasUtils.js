/**
 * getCroppedImgFile
 * Converts a crop region on an HTMLImageElement into a File (JPEG).
 *
 * Output is capped at MAX_OUTPUT_W × MAX_OUTPUT_H (4:5 portrait standard,
 * matching Instagram's 1080×1350 recommendation) to keep files lightweight
 * while preserving display quality across all contexts.
 *
 * @param {HTMLImageElement} image      - The <img> element displayed in the cropper
 * @param {{ x, y, width, height }} px  - Crop coordinates in NATURAL pixels
 * @param {string} fileName             - Output filename
 * @returns {Promise<File>}
 */

// ── Output resolution cap (matches the forced 4:5 crop ratio) ──────────────────
const MAX_OUTPUT_W = 1080;
const MAX_OUTPUT_H = 1350; // 4:5 portrait @ 1080p

export async function getCroppedImgFile(image, px, fileName = 'cropped.jpg') {
  const rawW = Math.round(px.width);
  const rawH = Math.round(px.height);

  // Scale down proportionally so neither dimension exceeds the cap
  let outW = rawW;
  let outH = rawH;
  if (outW > MAX_OUTPUT_W) {
    outH = Math.round(outH * MAX_OUTPUT_W / outW);
    outW = MAX_OUTPUT_W;
  }
  if (outH > MAX_OUTPUT_H) {
    outW = Math.round(outW * MAX_OUTPUT_H / outH);
    outH = MAX_OUTPUT_H;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    Math.round(px.x),
    Math.round(px.y),
    rawW,
    rawH,
    0,
    0,
    outW,
    outH,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('Canvas toBlob returned null')); return; }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

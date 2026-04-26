/**
 * getCroppedImgFile
 * Converts a crop region on an HTMLImageElement into a File (JPEG).
 *
 * @param {HTMLImageElement} image      - The <img> element displayed in the cropper
 * @param {{ x, y, width, height }} px  - Crop coordinates in NATURAL pixels
 * @param {string} fileName             - Output filename
 * @returns {Promise<File>}
 */
export async function getCroppedImgFile(image, px, fileName = 'cropped.jpg') {
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(px.width);
  canvas.height = Math.round(px.height);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    Math.round(px.x),
    Math.round(px.y),
    Math.round(px.width),
    Math.round(px.height),
    0,
    0,
    Math.round(px.width),
    Math.round(px.height),
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

// customer-portal/src/utils/biometricCheck.js
// Client-side Biometric Image Quality & Ridge Variance Verifier

export async function verifyFingerprintImage(file) {
  return new Promise((resolve) => {
    if (!file) {
      return resolve({ valid: false, error: "Please select a fingerprint scan image." });
    }

    // 1. MIME Type Verification
    const validMimes = ["image/png", "image/jpeg", "image/bmp"];
    if (!validMimes.includes(file.type)) {
      return resolve({ valid: false, error: "Invalid format. Only PNG, JPEG, or BMP biometric images are permitted." });
    }

    // 2. File Size Verification (Between 30KB and 5MB)
    if (file.size < 30 * 1024) {
      return resolve({ valid: false, error: "File too small (<30KB). Possible empty or corrupted biometric scan." });
    }
    if (file.size > 5 * 1024 * 1024) {
      return resolve({ valid: false, error: "File exceeds 5MB size limit." });
    }

    // 3. Image Dimensions & Pixel Variance Analysis
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width < 256 || img.height < 256) {
        return resolve({
          valid: false,
          error: `Low resolution (${img.width}x${img.height}). Biometric scanners require at least 256x256 pixels.`
        });
      }

      // Draw onto offscreen canvas for grayscale pixel distribution analysis
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 128, 128);
      const imgData = ctx.getImageData(0, 0, 128, 128).data;

      let sum = 0;
      let count = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const gray = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        sum += gray;
        count++;
      }
      const mean = sum / count;

      let variance = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const gray = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        variance += Math.pow(gray - mean, 2);
      }
      const stdDev = Math.sqrt(variance / count);

      // A genuine biometric ridge structure produces a high standard deviation (typically 35 - 75)
      // Solid white, solid black, or flat single-color images yield stdDev < 20
      if (stdDev < 28) {
        return resolve({
          valid: false,
          error: "Invalid biometric: Uniform image detected. No ridge pattern or biometric entropy found."
        });
      }

      return resolve({
        valid: true,
        stdDev: stdDev.toFixed(2),
        dimensions: `${img.width}x${img.height}`,
        error: null
      });
    };

    img.onerror = () => {
      return resolve({ valid: false, error: "Failed to decode image file. Corrupted data." });
    };
  });
}

// Utility to check image content using nsfwjs
import * as nsfwjs from "nsfwjs";
import * as tf from "@tensorflow/tfjs";

let nsfwModel = null;

// Loads the NSFW model (singleton)
async function loadModel() {
  if (!nsfwModel) {
    nsfwModel = await nsfwjs.load();
  }
  return nsfwModel;
}

// Checks if the image is safe (returns true if safe, false if NSFW/explicit/violent)
export async function isImageSafe(file, { threshold = 0.7 } = {}) {
  if (!file) return true;
  const model = await loadModel();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new window.Image();
      img.onload = async () => {
        try {
          const predictions = await model.classify(img);
          // NSFW classes: Porn, Hentai, Sexy, Neutral, Drawing
          // You may also want to block 'Sexy' or 'Hentai' depending on your policy
          const unsafe = predictions.find(
            (p) =>
              (p.className === "Porn" ||
                p.className === "Hentai" ||
                p.className === "Sexy" ||
                p.className === "Violence") &&
              p.probability >= threshold
          );
          resolve(!unsafe);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

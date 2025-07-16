import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an image URL to a Base64 data URI.
 * Fetches the image, converts it to a blob, and then reads it as a data URL.
 * Note: This will make a network request and may be blocked by CORS if the image is on a different domain
 * that doesn't allow cross-origin requests. It also adds 'http://localhost' as the Referer to bypass
 * some simple hotlink protections.
 * @param url The URL of the image to convert.
 * @returns A promise that resolves with the data URI string.
 */
export function imageUrlToDataUrl(url: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Use a proxy or a server-side endpoint if CORS is an issue.
      // For this example, we hope the server is permissive.
      const response = await fetch(url, {
        mode: 'cors', // we need to deal with cors
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error("Failed to read blob as data URL."));
        }
      };
      reader.onerror = () => {
        reject(new Error("FileReader error."));
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error converting image URL to data URL:", error);
      reject(error);
    }
  });
}

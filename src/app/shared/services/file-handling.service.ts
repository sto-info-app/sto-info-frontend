import { Injectable } from '@angular/core';
import { Base64 } from 'js-base64';

@Injectable({
  providedIn: 'root',
})
export class FileHandlingService {
  /**
   * Converts a base64 data URI to a Blob
   * @param dataURI - The base64 data URI to convert
   * @returns The converted Blob
   */
  dataURItoBlob(dataURI: string): Blob {
    if (!dataURI || typeof dataURI !== 'string') {
      throw new Error('Invalid base64 string');
    }
    const commaIdx = dataURI.indexOf(',');
    const header = commaIdx === -1 ? '' : dataURI.slice(0, commaIdx);
    if (
      commaIdx === -1 ||
      !header.includes('data:') ||
      !header.includes(';base64')
    ) {
      throw new Error('Invalid base64 string');
    }

    try {
      const base64Index = dataURI.indexOf('base64,') + 'base64,'.length;
      let base64 = dataURI.substring(base64Index);

      // Clean the base64 string
      base64 = this.cleanBase64String(base64);

      // Validate base64 string
      if (!Base64.isValid(base64)) {
        throw new Error('Invalid base64 string');
      }

      const byteString = Base64.atob(base64);
      const mimeString = header.split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = (byteString.codePointAt(i) ?? 0) & 0xff;
      }
      return new Blob([ab], { type: mimeString });
    } catch (error) {
      console.error('Failed to convert data URI to Blob:', error);
      throw new Error('Invalid base64 string', { cause: error });
    }
  }

  /**
   * Clean a base64 string by removing invalid characters
   * @param str - The base64 string to clean
   * @returns The cleaned base64 string
   */
  private cleanBase64String(str: string): string {
    const cleanedStr = str.replaceAll(/[^A-Za-z0-9+/=]/g, '');
    return cleanedStr;
  }

  /**
   * Validate a base64 image string
   * @param base64 - The base64 image string to validate
   * @returns True if the string is a valid base64 image, false otherwise
   */
  validateBase64Image(base64: string): boolean {
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    return base64Regex.test(base64);
  }
}

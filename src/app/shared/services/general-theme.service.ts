import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GeneralThemeService {
  dataCascadeRows = 8;
  dataCascadeCols = 7;
  dataCascadeMinChars = 3;
  dataCascadeMaxChars = 6;

  /**
   * Picks a random uppercase letter.
   *
   * @returns A single random character.
   */
  randomCharacter(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return characters.charAt(Math.floor(Math.random() * characters.length));
  }

  /**
   * Generates a random mixed alphanumeric value within the requested length range.
   *
   * @param minChars The minimum number of characters to generate.
   * @param maxChars The maximum number of characters to generate.
   * @returns A shuffled random string.
   */
  generateRandomValue(minChars: number, maxChars: number): string {
    const numbers = '0123456789';
    const special = ' -';
    let value = '';

    const length =
      Math.floor(Math.random() * (maxChars - minChars + 1)) + minChars;
    const numLetters = Math.floor(Math.random() * Math.min(3, length + 1)); // 0 to 2 letters, but not more than the length
    const numNumbers = length - numLetters;

    for (let i = 0; i < numLetters; i++) {
      value += this.randomCharacter();
    }

    for (let i = 0; i < numNumbers; i++) {
      value += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Shuffle the characters in the value to mix letters and numbers
    value = value
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    // Add space or hyphen with a 1 in 20 chance, but not for the first or last character
    if (length >= minChars + 1 && Math.random() < 1 / 20) {
      const specialIndex = Math.floor(Math.random() * (length - 3)) + 1;
      value =
        value.slice(0, specialIndex) +
        special.charAt(Math.floor(Math.random() * special.length)) +
        value.slice(specialIndex);
    }

    return value;
  }

  /**
   * Builds the LCARS-style data cascade markup.
   *
   * @returns HTML for the data cascade.
   */
  createDynamicDataCascade(): string {
    let html = '';

    for (let i = 1; i <= this.dataCascadeRows; i++) {
      html += `<div class="row-${i}">`;
      for (let j = 1; j <= this.dataCascadeCols; j++) {
        const value = this.generateRandomValue(
          this.dataCascadeMinChars,
          this.dataCascadeMaxChars,
        );
        html += `<div class="dc${j}">${value}</div>`;
      }
      html += '</div>';
    }

    return html;
  }

  /**
   * Builds the side-column LCARS text markup.
   *
   * @returns HTML for the side-column text.
   */
  createDynamicSideColumnText(): string {
    const value1 = this.generateRandomValue(2, 2);
    const value2 = this.generateRandomValue(6, 6);
    const html = `<span class="random-lcars-ref">${value1}<span class="hop">-${value2}</span></span>`;
    return html;
  }
}

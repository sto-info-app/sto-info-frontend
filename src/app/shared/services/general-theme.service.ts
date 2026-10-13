import { Injectable } from '@angular/core';

import { randomInt, shuffled } from 'src/app/shared/utils/random.utils';

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
    return characters.charAt(randomInt(characters.length));
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

    const length = randomInt(maxChars - minChars + 1) + minChars;
    const numLetters = randomInt(Math.min(3, length + 1)); // 0 to 2 letters, but not more than the length
    const numNumbers = length - numLetters;

    for (let i = 0; i < numLetters; i++) {
      value += this.randomCharacter();
    }

    for (let i = 0; i < numNumbers; i++) {
      value += numbers.charAt(randomInt(numbers.length));
    }

    // Shuffle the characters in the value to mix letters and numbers
    value = shuffled(value.split('')).join('');

    // Add space or hyphen with a 1 in 20 chance, but not for the first or last character
    if (length >= minChars + 1 && randomInt(20) === 0) {
      // Never fewer than one place to pick from, which `randomInt` needs.
      const specialIndex = randomInt(Math.max(1, length - 3)) + 1;
      value =
        value.slice(0, specialIndex) +
        special.charAt(randomInt(special.length)) +
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

import { saveFile } from './save-file.utils';

describe('saveFile', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    createObjectURL = jest.fn(() => 'blob:report');
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  it('offers the file under the name given, then lets it go', () => {
    const clicked: { href: string; download: string }[] = [];
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, download: this.download });
      });
    const file = new Blob(['# Growth']);

    try {
      saveFile(file, 'ninth-fleet-growth-2026-09-25.csv');
    } finally {
      click.mockRestore();
    }

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(clicked).toEqual([
      {
        href: 'blob:report',
        download: 'ninth-fleet-growth-2026-09-25.csv',
      },
    ]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    // The link is gone from the page.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('lets the file go even when the download fails', () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    try {
      expect(() => saveFile(new Blob([]), 'x.csv')).toThrow('blocked');
    } finally {
      click.mockRestore();
    }

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

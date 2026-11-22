/**
 * Hands the reader a file the page fetched, as a download.
 *
 * For a file that has to be asked for with the reader's token, which a plain
 * link cannot carry: the page fetches it, and this offers what came back
 * under a name the page chose. The object address is released once the
 * download has been handed over.
 *
 * @param file - What was fetched.
 * @param filename - What to call it.
 * @param doc - The document to download through; the page's own.
 */
export function saveFile(
  file: Blob,
  filename: string,
  doc: Document = document,
): void {
  const address = URL.createObjectURL(file);
  const link = doc.createElement('a');

  link.href = address;
  link.download = filename;
  link.rel = 'noopener';
  doc.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(address);
  }
}

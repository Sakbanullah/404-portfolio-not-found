// Validasi isi file upload (bukan ekstensi/MIME dari klien). Struktur dicek supaya file
// terpotong atau polyglot (PNG/JPEG + HTML menempel di ekor) tidak tersimpan.

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]); // length 0 + 'IEND' + CRC

// true: strukturnya utuh sampai akhir; false: terpotong / ada ekor asing.
function pngOk(buf) {
  const end = buf.lastIndexOf(PNG_IEND);
  return end !== -1 && end + PNG_IEND.length === buf.length;
}

function jpgOk(buf) {
  return buf.length > 4 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

export function checkImage(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) {
    return pngOk(buf) ? { ext: 'png', mime: 'image/png' } : { error: 'File gambar rusak' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return jpgOk(buf) ? { ext: 'jpg', mime: 'image/jpeg' } : { error: 'File gambar rusak' };
  }
  if (buf.length >= 6 && buf.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { ext: 'gif', mime: 'image/gif' };
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  const head = buf.subarray(0, 4096).toString('utf8').trimStart();
  if (head.startsWith('<') && /<svg[\s>]/i.test(head)) return { ext: 'svg', mime: 'image/svg+xml' };
  return { error: 'Format tidak didukung (PNG, JPG, GIF, WebP, atau SVG)' };
}

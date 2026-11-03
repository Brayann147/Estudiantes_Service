// El tipo se decide por los primeros bytes del archivo, no por la extensión ni por el
// Content-Type que declara el cliente (ambos se pueden falsificar).
const SIGNATURES = [
  { contentType: 'image/jpeg', extension: 'jpg', magic: [0xff, 0xd8, 0xff] },
  {
    contentType: 'image/png',
    extension: 'png',
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

function detectImageType(buffer) {
  if (!buffer) return null;
  return (
    SIGNATURES.find(
      ({ magic }) => buffer.length >= magic.length && magic.every((byte, i) => buffer[i] === byte),
    ) ?? null
  );
}

module.exports = { detectImageType };

const { detectImageType } = require('../../src/utils/imageType');

describe('detectImageType (por firma de bytes, no por extensión)', () => {
  it('reconoce JPG', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toMatchObject({
      contentType: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('reconoce PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectImageType(png)).toMatchObject({ contentType: 'image/png', extension: 'png' });
  });

  it('rechaza un PDF aunque se llame foto.png', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7 ...'))).toBeNull();
  });

  it('rechaza archivos vacíos o truncados', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
    expect(detectImageType(undefined)).toBeNull();
  });
});

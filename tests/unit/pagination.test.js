const { toOffset, buildPagination } = require('../../src/utils/pagination');

describe('utils/pagination', () => {
  it('toOffset calcula el desplazamiento de cada página', () => {
    expect(toOffset(1, 10)).toBe(0);
    expect(toOffset(2, 10)).toBe(10);
    expect(toOffset(3, 25)).toBe(50);
  });

  it('buildPagination calcula totalPages redondeando hacia arriba', () => {
    expect(buildPagination({ pageNumber: 1, pageSize: 10, totalItems: 25 })).toEqual({
      pageNumber: 1,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    expect(buildPagination({ pageNumber: 1, pageSize: 10, totalItems: 20 }).totalPages).toBe(2);
    expect(buildPagination({ pageNumber: 1, pageSize: 10, totalItems: 0 }).totalPages).toBe(0);
  });
});

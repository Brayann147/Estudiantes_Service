function toOffset(pageNumber, pageSize) {
  return (pageNumber - 1) * pageSize;
}

function buildPagination({ pageNumber, pageSize, totalItems }) {
  return {
    pageNumber,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

module.exports = { toOffset, buildPagination };

/**
 * Escapa los comodines de LIKE/ILIKE para que el texto del usuario se busque literalmente.
 * Se usa junto con ESCAPE '\' en la consulta.
 */
function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Construye una cláusula WHERE parametrizada ($1, $2, ...). El valor SIEMPRE viaja
 * como parámetro; solo el fragmento SQL (escrito por nosotros) se concatena.
 */
class WhereBuilder {
  constructor() {
    this.clauses = [];
    this.params = [];
  }

  // template usa "$?" como marcador del parámetro, p. ej.: add('s.status = $?', 'active')
  add(template, value) {
    this.params.push(value);
    this.clauses.push(template.replace('$?', `$${this.params.length}`));
    return this;
  }

  get sql() {
    return this.clauses.length ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }
}

/**
 * Arma el "SET col = $n, ..." de un UPDATE usando SOLO las claves presentes en `columnMap`
 * (lista blanca). Ignora los valores `undefined`; `null` sí se guarda como NULL.
 */
function buildUpdateSet(columnMap, changes, firstParamIndex = 1) {
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (changes[key] === undefined) continue;
    params.push(changes[key]);
    sets.push(`${column} = $${firstParamIndex + params.length - 1}`);
  }
  return { sets, params };
}

module.exports = { escapeLike, WhereBuilder, buildUpdateSet };

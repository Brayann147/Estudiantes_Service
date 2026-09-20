const programs = [
  ['ISIS', 'Ingeniería de Sistemas', 'Facultad de Ingeniería', 'onsite', 'active'],
  ['IIND', 'Ingeniería Industrial', 'Facultad de Ingeniería', 'onsite', 'active'],
  ['ICIV', 'Ingeniería Civil', 'Facultad de Ingeniería', 'onsite', 'active'],
  ['ADEM', 'Administración de Empresas', 'Facultad de Ciencias Económicas', 'hybrid', 'active'],
  ['CPUB', 'Contaduría Pública', 'Facultad de Ciencias Económicas', 'online', 'active'],
  ['DERE', 'Derecho', 'Facultad de Derecho y Ciencias Sociales', 'onsite', 'active'],
  ['TGRE', 'Tecnología en Gestión de Redes', 'Facultad de Ingeniería', 'online', 'inactive'],
];

async function run(client) {
  for (const [code, name, faculty, modality, status] of programs) {
    await client.query(
      `INSERT INTO programs (code, name, faculty, modality, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [code, name, faculty, modality, status],
    );
  }
}

module.exports = { run };

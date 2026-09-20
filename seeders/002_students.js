// [nombre, apellido, tipoDoc, númeroDoc, nacimiento, género, estado, códigoPrograma, correo]
// Laura Gómez es el estudiante #12 (ejemplo del contrato con el Gateway) cuando se siembra
// sobre una base vacía.
const students = [
  [
    'Juan Camilo',
    'Rodríguez',
    'CC',
    '1001000001',
    '2002-03-14',
    'male',
    'active',
    'ISIS',
    'juan.rodriguez@example.com',
  ],
  [
    'María Fernanda',
    'López',
    'CC',
    '1001000002',
    '2001-07-22',
    'female',
    'active',
    'ISIS',
    'maria.lopez@example.com',
  ],
  [
    'Andrés Felipe',
    'Martínez',
    'CC',
    '1001000003',
    '2000-11-05',
    'male',
    'active',
    'IIND',
    'andres.martinez@example.com',
  ],
  [
    'Valentina',
    'Torres',
    'CC',
    '1001000004',
    '2003-01-30',
    'female',
    'active',
    'ICIV',
    'valentina.torres@example.com',
  ],
  [
    'Santiago',
    'Ramírez',
    'CC',
    '1001000005',
    '2002-09-18',
    'male',
    'inactive',
    'ADEM',
    'santiago.ramirez@example.com',
  ],
  [
    'Daniela',
    'Castro',
    'CC',
    '1001000006',
    '2001-05-09',
    'female',
    'active',
    'CPUB',
    'daniela.castro@example.com',
  ],
  [
    'Sebastián',
    'Herrera',
    'CC',
    '1001000007',
    '1999-12-02',
    'male',
    'graduated',
    'ISIS',
    'sebastian.herrera@example.com',
  ],
  [
    'Camila',
    'Vargas',
    'CC',
    '1001000008',
    '2002-04-27',
    'female',
    'active',
    'DERE',
    'camila.vargas@example.com',
  ],
  [
    'Nicolás',
    'Moreno',
    'CC',
    '1001000009',
    '2003-08-11',
    'male',
    'active',
    'IIND',
    'nicolas.moreno@example.com',
  ],
  [
    'Isabella',
    'Jiménez',
    'TI',
    '1001000010',
    '2007-02-16',
    'female',
    'active',
    'ADEM',
    'isabella.jimenez@example.com',
  ],
  [
    'Mateo',
    'Ortiz',
    'CC',
    '1001000011',
    '2001-10-25',
    'male',
    'suspended',
    'ICIV',
    'mateo.ortiz@example.com',
  ],
  [
    'Laura',
    'Gómez',
    'CC',
    '1001000012',
    '2002-06-08',
    'female',
    'active',
    'ISIS',
    'laura.gomez@example.com',
  ],
  [
    'Diego Alejandro',
    'Rojas',
    'CC',
    '1001000013',
    '2000-03-21',
    'male',
    'active',
    'ISIS',
    'diego.rojas@example.com',
  ],
  [
    'Sofía',
    'Mendoza',
    'CC',
    '1001000014',
    '2003-05-13',
    'female',
    'active',
    'CPUB',
    'sofia.mendoza@example.com',
  ],
  [
    'Julián',
    'Cárdenas',
    'CE',
    '1001000015',
    '2001-01-19',
    'male',
    'active',
    'IIND',
    'julian.cardenas@example.com',
  ],
  [
    'Paula Andrea',
    'Silva',
    'CC',
    '1001000016',
    '2002-12-01',
    'female',
    'graduated',
    'DERE',
    'paula.silva@example.com',
  ],
  [
    'Felipe',
    'Acosta',
    'CC',
    '1001000017',
    '2000-08-30',
    'male',
    'active',
    'ICIV',
    'felipe.acosta@example.com',
  ],
  [
    'Natalia',
    'Peña',
    'CC',
    '1001000018',
    '2003-03-03',
    'female',
    'active',
    'ISIS',
    'natalia.pena@example.com',
  ],
  [
    'Esteban',
    'Guerrero',
    'CC',
    '1001000019',
    '2001-07-07',
    'male',
    'inactive',
    'ADEM',
    'esteban.guerrero@example.com',
  ],
  [
    'Mariana',
    'Díaz',
    'CC',
    '1001000020',
    '2002-02-14',
    'female',
    'active',
    'IIND',
    'mariana.diaz@example.com',
  ],
  [
    'Tomás',
    'Salazar',
    'CC',
    '1001000021',
    '2003-09-23',
    'male',
    'active',
    'CPUB',
    'tomas.salazar@example.com',
  ],
  [
    'Juliana',
    'Ríos',
    'PASSPORT',
    'AB1234567',
    '2001-04-12',
    'female',
    'active',
    'DERE',
    'juliana.rios@example.com',
  ],
  [
    'Alejandro',
    'Cortés',
    'CC',
    '1001000023',
    '2000-06-29',
    'male',
    'active',
    'ISIS',
    'alejandro.cortes@example.com',
  ],
  [
    'Gabriela',
    'Nieto',
    'CC',
    '1001000024',
    '2002-10-10',
    'other',
    'active',
    'ADEM',
    'gabriela.nieto@example.com',
  ],
  [
    'Samuel',
    'Bautista',
    'CC',
    '1001000025',
    '2003-11-28',
    'male',
    'active',
    'ICIV',
    'samuel.bautista@example.com',
  ],
];

async function run(client) {
  let n = 0;
  for (const [
    first,
    last,
    docType,
    docNumber,
    birth,
    gender,
    status,
    programCode,
    email,
  ] of students) {
    n += 1;
    await client.query(
      `INSERT INTO students
         (first_name, last_name, document_type, document_number, birth_date, gender, status, program_id)
       SELECT $1, $2, $3, $4, $5, $6, $7, p.id FROM programs p WHERE p.code = $8
       ON CONFLICT DO NOTHING`,
      [first, last, docType, docNumber, birth, gender, status, programCode],
    );

    // Contacto principal (1:1)
    const phone = `3${String(100000000 + n * 7919).slice(0, 9)}`;
    await client.query(
      `INSERT INTO contacts (student_id, email, phone, address, emergency_contact_name, emergency_contact_phone)
       SELECT s.id, $3, $4, $5, $6, $7 FROM students s
       WHERE s.document_type = $1 AND s.document_number = $2
       ON CONFLICT DO NOTHING`,
      [
        docType,
        docNumber,
        email,
        phone,
        `Calle ${10 + n} # ${n + 3}-${20 + n}, Tunja`,
        `Familiar de ${first}`,
        `3${String(200000000 + n * 6883).slice(0, 9)}`,
      ],
    );

    // Documento principal (1:N): el mismo documento de identidad del estudiante.
    await client.query(
      `INSERT INTO documents (student_id, type, number, issue_date, expiration_date, is_primary)
       SELECT s.id, s.document_type, s.document_number, $3::date, $4::date, true FROM students s
       WHERE s.document_type = $1 AND s.document_number = $2
       ON CONFLICT DO NOTHING`,
      [
        docType,
        docNumber,
        docType === 'PASSPORT' ? '2022-01-15' : '2020-06-01',
        docType === 'PASSPORT' ? '2032-01-14' : null,
      ],
    );

    // Algunos estudiantes tienen además el carné estudiantil (documento secundario).
    if (n % 3 === 0) {
      await client.query(
        `INSERT INTO documents (student_id, type, number, issue_date, expiration_date, is_primary)
         SELECT s.id, 'STUDENT_ID', $3, '2024-02-01', '2028-01-31', false FROM students s
         WHERE s.document_type = $1 AND s.document_number = $2
         ON CONFLICT DO NOTHING`,
        [docType, docNumber, `UPTC-${String(n).padStart(5, '0')}`],
      );
    }
  }
}

module.exports = { run };

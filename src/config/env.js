const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const port = z.coerce.number().int().min(1).max(65535);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: port.default(3001),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'silent']).optional(),
  CORS_ORIGIN: z.string().min(1).default('*'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: port.default(5433),
  DB_USER: z.string().min(1, 'es obligatoria'),
  DB_PASSWORD: z.string().min(1, 'es obligatoria'),
  DB_NAME: z.string().min(1).default('estudiantes_db'),
  DB_NAME_TEST: z.string().min(1).optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  // Almacenamiento de objetos (S3). Las credenciales NO van aquí: el SDK las toma del rol de la tarea
  // en la nube o de AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY en local (MinIO).
  S3_BUCKET: z.string().min(3).default('estudiantes-fotos'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ENDPOINT: z.url().optional(),
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  PHOTO_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(600),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  const message = `Configuración de entorno inválida (revisa tu archivo .env):\n${lines.join('\n')}`;
  if (process.env.NODE_ENV === 'test') {
    throw new Error(message);
  }
  console.error(message);
  process.exit(1);
}

const raw = parsed.data;
const isTest = raw.NODE_ENV === 'test';

module.exports = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest,
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
  corsOrigins: raw.CORS_ORIGIN === '*' ? '*' : raw.CORS_ORIGIN.split(',').map((o) => o.trim()),
  db: {
    host: raw.DB_HOST,
    port: raw.DB_PORT,
    user: raw.DB_USER,
    password: raw.DB_PASSWORD,
    // Las pruebas usan SIEMPRE una base distinta para no tocar los datos de desarrollo.
    database: isTest ? (raw.DB_NAME_TEST ?? `${raw.DB_NAME}_test`) : raw.DB_NAME,
    max: raw.DB_POOL_MAX,
  },
  storage: {
    bucket: raw.S3_BUCKET,
    region: raw.S3_REGION,
    endpoint: raw.S3_ENDPOINT,
    // Las URLs firmadas las abre el navegador: en local el endpoint interno (red de Docker) puede
    // no ser alcanzable desde fuera, por eso se firma contra el endpoint público si se define.
    publicEndpoint: raw.S3_PUBLIC_ENDPOINT ?? raw.S3_ENDPOINT,
    forcePathStyle: raw.S3_FORCE_PATH_STYLE,
    urlTtlSeconds: raw.PHOTO_URL_TTL_SECONDS,
  },
};

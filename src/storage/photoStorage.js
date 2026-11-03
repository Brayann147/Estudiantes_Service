const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { storage } = require('../config/env');

const clientFor = (endpoint) =>
  new S3Client({
    region: storage.region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: storage.forcePathStyle,
  });

const s3 = clientFor(storage.endpoint);
const signer = storage.publicEndpoint === storage.endpoint ? s3 : clientFor(storage.publicEndpoint);

async function putPhoto(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function deletePhoto(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
}

/** URL temporal de solo lectura: el bucket es privado, sin firma el objeto no es accesible. */
async function signedPhotoUrl(key) {
  return getSignedUrl(signer, new GetObjectCommand({ Bucket: storage.bucket, Key: key }), {
    expiresIn: storage.urlTtlSeconds,
  });
}

module.exports = { putPhoto, deletePhoto, signedPhotoUrl, urlTtlSeconds: storage.urlTtlSeconds };

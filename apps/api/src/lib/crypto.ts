import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from '@aws-sdk/client-kms';

const ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

const kmsKeyId = process.env.AWS_KMS_KEY_ID;
const kmsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

const kmsClient = kmsKeyId
  ? new KMSClient({ region: kmsRegion })
  : null;

function getStaticKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is required when AWS_KMS_KEY_ID is not configured');
  }
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return Buffer.from(key, 'base64');
}

type CipherEnvelope = {
  version: 'aes.v1' | 'kms.v1';
  cipherText: string;
  iv: string;
  authTag: string;
  encryptedDataKey?: string;
  keyId?: string;
};

async function generateDataKey(): Promise<{ plaintextKey: Buffer; encryptedKey: Buffer; keyId: string }>
{ if (!kmsClient || !kmsKeyId) {
    throw new Error('Attempted to generate KMS data key without kmsClient initialized');
  }
  const command = new GenerateDataKeyCommand({
    KeyId: kmsKeyId,
    KeySpec: 'AES_256',
  });
  const { CiphertextBlob, Plaintext, KeyId } = await kmsClient.send(command);
  if (!CiphertextBlob || !Plaintext || !KeyId) {
    throw new Error('KMS GenerateDataKeyCommand response missing fields');
  }
  return {
    plaintextKey: Buffer.from(Plaintext as Uint8Array),
    encryptedKey: Buffer.from(CiphertextBlob as Uint8Array),
    keyId: KeyId,
  };
}

async function decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
  if (!kmsClient) {
    throw new Error('Attempted to decrypt KMS data key without kmsClient initialized');
  }
  const command = new DecryptCommand({ CiphertextBlob: encryptedKey });
  const { Plaintext } = await kmsClient.send(command);
  if (!Plaintext) {
    throw new Error('KMS DecryptCommand response missing Plaintext');
  }
  return Buffer.from(Plaintext as Uint8Array);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('encrypt() requires plaintext');
  }

  const iv = randomBytes(IV_LENGTH);
  let key: Buffer;
  let envelope: CipherEnvelope;

  if (kmsClient && kmsKeyId) {
    const { plaintextKey, encryptedKey, keyId } = await generateDataKey();
    key = plaintextKey;
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    envelope = {
      version: 'kms.v1',
      cipherText: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedDataKey: encryptedKey.toString('base64'),
      keyId,
    };
  } else {
    key = getStaticKey();
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) in base64 or hex');
    }
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    envelope = {
      version: 'aes.v1',
      cipherText: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
}

export async function decrypt(payload: string): Promise<string> {
  if (!payload) {
    throw new Error('decrypt() requires payload');
  }
  let envelope: CipherEnvelope;
  try {
    envelope = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as CipherEnvelope;
  } catch (error) {
    throw new Error('Invalid cipher payload');
  }

  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.cipherText, 'base64');

  if (envelope.version === 'kms.v1') {
    if (!envelope.encryptedDataKey) {
      throw new Error('Missing encrypted data key in payload');
    }
    const encryptedKeyBuffer = Buffer.from(envelope.encryptedDataKey, 'base64');
    const key = await decryptDataKey(encryptedKeyBuffer);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plaintext;
  }

  if (envelope.version === 'aes.v1') {
    const key = getStaticKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plaintext;
  }

  throw new Error(`Unsupported cipher payload version: ${envelope.version}`);
}

export function redactSecret(value: string | undefined | null): string {
  if (!value) return '';
  return value.slice(0, 4) + '…' + value.slice(-4);
}

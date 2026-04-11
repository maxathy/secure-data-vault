import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KeysetHandle, SerializedKeyset } from './types.js';
import { deserializeKeyset } from './keyset.js';

let devWarningEmitted = false;

/**
 * Load the encryption keyset based on the CRYPTO_CORE_MODE environment variable.
 *
 * - `dev` (default): loads INSECURE-DEV-ONLY.keyset.json from the package's
 *   keysets/ directory. Emits a WARN log on first call.
 * - `prod`: reads KMS_KEY_URI and loads the keyset from Cloud KMS.
 *   (Placeholder — requires GCP credentials and Tink KMS integration.)
 */
export function loadEncryptionKeyset(mode?: string): KeysetHandle {
  const resolvedMode = mode ?? process.env['CRYPTO_CORE_MODE'] ?? 'dev';

  if (resolvedMode === 'prod') {
    const kmsUri = process.env['KMS_KEY_URI'];
    if (!kmsUri) {
      throw new Error('KMS_KEY_URI is required when CRYPTO_CORE_MODE=prod');
    }
    // Production: integrate with GCP KMS via @google-cloud/kms
    // The keyset would be fetched and unwrapped by the KMS HSM.
    // Plaintext key material never touches disk.
    throw new Error(
      'Production KMS integration not yet implemented. ' +
        'Set CRYPTO_CORE_MODE=dev for local development.',
    );
  }

  if (!devWarningEmitted) {
    console.warn(
      '[crypto-core] INSECURE-DEV-ONLY keyset loaded \u2014 never use in production',
    );
    devWarningEmitted = true;
  }

  const keysetPath = resolveDevKeysetPath('INSECURE-DEV-ONLY.keyset.json');
  const raw: SerializedKeyset = JSON.parse(readFileSync(keysetPath, 'utf-8'));
  return deserializeKeyset(raw);
}

/**
 * Load the MAC keyset used for audit log HMAC signatures.
 * This is a SEPARATE keyset from the encryption keyset.
 */
export function loadMacKeyset(mode?: string): Buffer {
  const resolvedMode = mode ?? process.env['CRYPTO_CORE_MODE'] ?? 'dev';

  if (resolvedMode === 'prod') {
    throw new Error('Production MAC keyset loading not yet implemented.');
  }

  const keysetPath = resolveDevKeysetPath('INSECURE-DEV-ONLY.mac.keyset.json');
  const raw = JSON.parse(readFileSync(keysetPath, 'utf-8'));
  return Buffer.from(raw.keyMaterial, 'base64');
}

/** Reset the dev warning flag — used in tests. */
export function resetDevWarning(): void {
  devWarningEmitted = false;
}

function resolveDevKeysetPath(filename: string): string {
  return resolve(__dirname, '..', 'keysets', filename);
}

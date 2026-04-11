# @secure-data-vault/crypto-core

AES-256-GCM envelope encryption library with Associated Authenticated Data (AAD) binding.

## Overview

This package implements the envelope encryption pattern using Node.js native `crypto`:

1. A random **Data Encryption Key (DEK)** is generated per `encrypt()` call
2. Plaintext is encrypted with the DEK using **AES-256-GCM**
3. The DEK is wrapped (encrypted) with a **Key Encryption Key (KEK)** from the keyset
4. `recordId:tenantId` is bound as **AAD**, preventing ciphertext transplant between records or tenants

The plaintext DEK never touches disk and is zeroed from memory after use.

## API

```typescript
import { encrypt, decrypt, loadEncryptionKeyset } from '@secure-data-vault/crypto-core';

const keyset = loadEncryptionKeyset();

const envelope = await encrypt(
  JSON.stringify({ sensitive: 'data' }),
  { recordId: 'uuid-1', tenantId: 'uuid-2' },
  keyset,
);

const plaintext = await decrypt(envelope, { recordId: 'uuid-1', tenantId: 'uuid-2' }, keyset);
```

## Dev Keyset

The `keysets/INSECURE-DEV-ONLY.keyset.json` file is committed for local development. It enables the full encryption round-trip without any GCP credentials.

> **WARNING:** This keyset must never be used in production. The runtime emits a WARN log on first use.

## Production

Set `CRYPTO_CORE_MODE=prod` and `KMS_KEY_URI` to load the keyset from Google Cloud KMS. The KMS HSM unwraps the keyset in hardware — plaintext key material never leaves the HSM boundary.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  encrypt,
  decrypt,
  loadEncryptionKeyset,
  type CryptoContext,
  type EncryptedEnvelope,
  type KeysetHandle,
} from '@secure-data-vault/crypto-core';

/**
 * NestJS service wrapping crypto-core's envelope encryption.
 * Loads the keyset once at module init and provides encrypt/decrypt
 * methods for the application layer.
 */
@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private keyset!: KeysetHandle;

  onModuleInit() {
    this.keyset = loadEncryptionKeyset();
    this.logger.log('Encryption keyset loaded');
  }

  async encrypt(plaintext: string, context: CryptoContext): Promise<EncryptedEnvelope> {
    return encrypt(plaintext, context, this.keyset);
  }

  async decrypt(envelope: EncryptedEnvelope, context: CryptoContext): Promise<string> {
    return decrypt(envelope, context, this.keyset);
  }
}

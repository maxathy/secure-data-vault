# Cloud KMS key ring and crypto keys for envelope encryption
# and audit HMAC signing.

resource "google_kms_key_ring" "vault" {
  name     = "vault-keyring"
  location = var.region
}

# Master key for data encryption (wraps per-record DEKs)
resource "google_kms_crypto_key" "vault_dek_master" {
  name            = "vault-dek-master"
  key_ring        = google_kms_key_ring.vault.id
  rotation_period = "7776000s" # 90 days

  purpose = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Separate key for audit log HMAC signatures
# Using a distinct key prevents keyset confusion between
# data encryption and audit signing operations.
resource "google_kms_crypto_key" "vault_audit_mac" {
  name            = "vault-audit-mac"
  key_ring        = google_kms_key_ring.vault.id
  rotation_period = "7776000s" # 90 days

  purpose = "MAC"

  version_template {
    algorithm        = "HMAC_SHA256"
    protection_level = "HSM"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Service accounts and least-privilege IAM bindings.

resource "google_service_account" "vault_api" {
  account_id   = "vault-api"
  display_name = "Vault API Service Account"
  description  = "Service account for the vault-api Cloud Run service."
}

# Allow vault-api to use the DEK master key for encrypt/decrypt
resource "google_kms_crypto_key_iam_member" "vault_api_dek" {
  crypto_key_id = google_kms_crypto_key.vault_dek_master.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.vault_api.email}"
}

# Allow vault-api to use the audit MAC key for signing only
resource "google_kms_crypto_key_iam_member" "vault_api_mac" {
  crypto_key_id = google_kms_crypto_key.vault_audit_mac.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${google_service_account.vault_api.email}"
}

# Allow vault-api to connect to Cloud SQL
resource "google_project_iam_member" "vault_api_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.vault_api.email}"
}

# Allow vault-api to write structured logs
resource "google_project_iam_member" "vault_api_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vault_api.email}"
}

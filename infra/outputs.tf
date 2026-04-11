output "kms_key_ring_id" {
  value       = google_kms_key_ring.vault.id
  description = "KMS key ring ID"
}

output "dek_master_key_id" {
  value       = google_kms_crypto_key.vault_dek_master.id
  description = "DEK master crypto key ID"
}

output "audit_mac_key_id" {
  value       = google_kms_crypto_key.vault_audit_mac.id
  description = "Audit MAC crypto key ID"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.vault.connection_name
  description = "Cloud SQL connection name for Cloud SQL Proxy"
}

output "vault_api_service_account_email" {
  value       = google_service_account.vault_api.email
  description = "Vault API service account email"
}

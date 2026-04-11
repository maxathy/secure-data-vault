# Cloud Logging sink for audit-relevant log entries.
# Routes vault-api logs to a dedicated BigQuery dataset
# for compliance retention and analysis.

resource "google_logging_project_sink" "vault_audit_sink" {
  name        = "vault-audit-sink"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/vault_audit_logs"

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="vault-api"
    jsonPayload.labels.service="vault-api"
  EOT

  unique_writer_identity = true
}

resource "google_bigquery_dataset" "vault_audit_logs" {
  dataset_id = "vault_audit_logs"
  location   = var.region

  default_table_expiration_ms = 31536000000 # 365 days

  labels = {
    compliance = "audit-retention"
    service    = "vault-api"
  }
}

# Grant the logging sink writer access to BigQuery
resource "google_bigquery_dataset_iam_member" "sink_writer" {
  dataset_id = google_bigquery_dataset.vault_audit_logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.vault_audit_sink.writer_identity
}

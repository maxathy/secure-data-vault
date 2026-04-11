# Cloud SQL for Postgres 16 instance.
# No unsupported extensions — gen_random_uuid() is built-in since Postgres 13.

resource "google_sql_database_instance" "vault" {
  name             = "vault-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    database_flags {
      name  = "log_statement"
      value = "ddl"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "vault" {
  name     = var.db_name
  instance = google_sql_database_instance.vault.name
}

resource "google_sql_user" "vault_app" {
  name     = "vault-app"
  instance = google_sql_database_instance.vault.name
  password = "CHANGE_ME_IN_SECRET_MANAGER"
}

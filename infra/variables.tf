variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "YOUR_GCP_PROJECT"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "vault"
}

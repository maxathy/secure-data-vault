terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Backend configuration for remote state.
  # Uncomment and configure for production use.
  # backend "gcs" {
  #   bucket = "YOUR_TERRAFORM_STATE_BUCKET"
  #   prefix = "secure-data-vault"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

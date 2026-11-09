terraform {
  # >= 1.10 for the native S3 state lock (use_lockfile), no DynamoDB-style
  # lock table needed — Selectel Object Storage has no equivalent of it.
  required_version = ">= 1.10"

  required_providers {
    selectel = {
      source  = "selectel/selectel"
      version = "~> 8.6" # TODO verify: docs.selectel.ru examples mix ~> 6.0 and ~> 8.6; pin to the latest published on registry.terraform.io before first apply.
    }
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 3.4"
    }
    # Selectel Object Storage buckets are managed through the AWS provider
    # against Selectel's S3-compatible endpoint — the selectel provider has
    # no bucket resource (only selectel_iam_s3_credentials_v1 for keys).
    # TODO verify: confirm this is still the recommended approach and that
    # no selectel_s3_bucket-style resource has shipped since.
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

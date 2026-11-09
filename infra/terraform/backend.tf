# Remote state on Selectel Object Storage (S3-compatible). The bucket itself
# is NOT managed by this configuration — it is created once by hand before
# the first `terraform init`, see README.md "Prerequisites". Credentials and
# the bucket name are passed via -backend-config / env vars, never hardcoded.
#
# terraform init -backend-config=backend.tfvars
#
# backend.tfvars (not committed, see .gitignore):
#   bucket     = "bimeet-prod-tfstate"
#   access_key = "..."
#   secret_key = "..."
terraform {
  backend "s3" {
    endpoint = "https://s3.ru-9.storage.selcloud.ru" # TODO verify: confirm the ru-9 S3 endpoint hostname; docs.selectel.ru example uses ru-1 (https://s3.ru-1.storage.selcloud.ru).
    key      = "bimeet-prod.tfstate"
    region   = "ru-9"

    use_lockfile = true # Terraform >= 1.10 native state locking, no DynamoDB-style table needed.

    # Selectel's S3 is not AWS, so the AWS-specific validation steps must be
    # skipped (documented pattern for any non-AWS S3-compatible backend).
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    skip_metadata_api_check     = true
  }
}

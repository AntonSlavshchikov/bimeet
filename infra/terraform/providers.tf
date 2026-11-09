# Keystone v3 identity endpoint, shared by the selectel and openstack
# providers. TODO verify: confirmed on docs.selectel.ru/en/terraform/configure-terraform-environment/
# (selectel provider wants a trailing slash, openstack provider does not).
locals {
  selectel_auth_url  = "https://cloud.api.selcloud.ru/identity/v3/"
  openstack_auth_url = "https://cloud.api.selcloud.ru/identity/v3"
}

provider "selectel" {
  domain_name = var.selectel_domain
  username    = var.selectel_username
  password    = var.selectel_password
  auth_region = var.region
  auth_url    = local.selectel_auth_url
}

# Project-scoped OpenStack access. tenant_id/user_name/password are filled in
# once the Terraform-dedicated project and service user exist (project.tf) —
# this is the standard Selectel pattern of bootstrapping OpenStack auth from
# resources the selectel provider just created.
provider "openstack" {
  auth_url    = local.openstack_auth_url
  domain_name = var.selectel_domain
  tenant_id   = selectel_vpc_project_v2.bimeet.id
  user_name   = selectel_iam_serviceuser_v1.terraform.name
  password    = var.terraform_serviceuser_password
  region      = var.region
}

# Selectel Object Storage is S3-compatible; the AWS provider talks to it
# directly for bucket management (no selectel_s3_bucket resource exists).
# Uses the "terraform" service user's own S3 credentials (project-wide),
# not the app/backup credentials — those are scoped for runtime use only,
# see storage.tf.
provider "aws" {
  region                      = var.region
  access_key                  = selectel_iam_s3_credentials_v1.terraform.access_key
  secret_key                  = selectel_iam_s3_credentials_v1.terraform.secret_key
  skip_credentials_validation = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  endpoints {
    s3 = "https://s3.${var.region}.storage.selcloud.ru" # TODO verify: same endpoint pattern as the state backend.
  }
}

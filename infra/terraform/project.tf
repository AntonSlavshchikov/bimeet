# The Bimeet project. Created with the bootstrap (account-scoped) credentials
# in var.selectel_username/password.
resource "selectel_vpc_project_v2" "bimeet" {
  name = "${var.project_name}-${var.environment}"
}

# Project-scoped service user Terraform uses for everything after the
# project itself exists: OpenStack resources (network, VM, security group)
# via the openstack provider, and Object Storage bucket management via the
# aws provider (providers.tf). Keeping this separate from the bootstrap user
# means the account-scoped admin credentials are only ever used once, by
# hand, to set the two service users below up.
resource "selectel_iam_serviceuser_v1" "terraform" {
  name     = "terraform-${var.environment}"
  password = var.terraform_serviceuser_password

  role {
    role_name  = "member"
    scope      = "project"
    project_id = selectel_vpc_project_v2.bimeet.id
  }
}

# CI service user: only used by GitHub Actions to push/pull images to the
# Container Registry (registry.tf).
#
# TODO verify: Selectel IAM roles (checked: "member", "iam.admin") are not
# documented as being scopable down to "registry push/pull only" — "member"
# at project scope is the least-privileged role that still works with CRaaS.
# If Selectel ships a finer-grained role, narrow this. Until then, the CI
# user has the same project-member access as the terraform user; it is kept
# as a SEPARATE user anyway so its credential can be rotated or revoked
# independently without touching Terraform's own access.
resource "selectel_iam_serviceuser_v1" "ci" {
  name     = "ci-${var.environment}"
  password = var.ci_serviceuser_password

  role {
    role_name  = "member"
    scope      = "project"
    project_id = selectel_vpc_project_v2.bimeet.id
  }
}

# S3 credentials for the "terraform" service user — used only by the aws
# provider (providers.tf) to manage the Object Storage buckets in storage.tf.
resource "selectel_iam_s3_credentials_v1" "terraform" {
  name       = "terraform-${var.environment}"
  user_id    = selectel_iam_serviceuser_v1.terraform.id
  project_id = selectel_vpc_project_v2.bimeet.id
}

variable "selectel_domain" {
  description = "Selectel account number (domain_name), shown in the top-right corner of my.selectel.ru."
  type        = string
}

variable "selectel_username" {
  description = "Bootstrap service user name with account-scoped `member` + `iam.admin` roles, created by hand before running Terraform (see README Prerequisites). Used only to create the project and the project-scoped service users below."
  type        = string
}

variable "selectel_password" {
  description = "Password for selectel_username."
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the Selectel Cloud Platform project Terraform creates for Bimeet."
  type        = string
  default     = "bimeet"
}

variable "region" {
  description = "Selectel pool/region, e.g. ru-9. Must be in the `ru-9` format, not `SPB-2`."
  type        = string
  default     = "ru-9"

  validation {
    condition     = can(regex("^ru-[0-9]+$", var.region))
    error_message = "region must look like \"ru-9\", not a datacenter code like \"SPB-2\"."
  }
}

variable "availability_zone" {
  description = "Availability zone within region, e.g. ru-9a."
  type        = string
  default     = "ru-9a"
}

variable "environment" {
  description = "Deployment environment name, used in resource names and tags."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging"], var.environment)
    error_message = "environment must be \"prod\" or \"staging\"."
  }
}

variable "terraform_serviceuser_password" {
  description = "Password to set on the project-scoped \"terraform\" service user that Terraform creates for itself (used by the openstack provider and for S3 bucket management). Generate it once and keep it in backend.tfvars-style secret storage, not in version control."
  type        = string
  sensitive   = true
}

variable "ci_serviceuser_password" {
  description = "Password to set on the project-scoped \"ci\" service user used by GitHub Actions to push/pull images to the Container Registry."
  type        = string
  sensitive   = true
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to reach the VM over SSH (port 22). Keep this to your own admin IP(s), never 0.0.0.0/0."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0
    error_message = "admin_cidrs must not be empty, or SSH would be unreachable from anywhere."
  }
}

variable "admin_ssh_public_key" {
  description = "Public SSH key (e.g. contents of ~/.ssh/id_ed25519.pub) installed for the \"deploy\" user via cloud-init."
  type        = string
}

variable "vm_flavor" {
  description = "VM size."
  type = object({
    vcpus = number
    ram   = number # MB
    disk  = number # GB, boot volume size
  })
  default = {
    vcpus = 2
    ram   = 4096
    disk  = 40
  }
}

variable "app_serviceuser_password" {
  description = "Password to set on the project-scoped service user whose S3 credentials the backend uses to reach the uploads bucket."
  type        = string
  sensitive   = true
}

variable "backup_serviceuser_password" {
  description = "Password to set on the project-scoped service user whose S3 credentials the backup script uses to reach the backups bucket."
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Primary domain name for the DNS zone and A records, e.g. bimeet.pro."
  type        = string
  default     = "bimeet.pro"
}

# Common tags/metadata applied to every resource that supports them.
locals {
  common_tags = {
    project    = "bimeet"
    env        = var.environment
    managed-by = "terraform"
  }
}

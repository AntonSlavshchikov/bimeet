variable "timeweb_token" {
  description = "Timeweb Cloud API token (panel: API и Terraform). Put it in terraform.tfvars, never in git."
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment name, used in resource names."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging"], var.environment)
    error_message = "environment must be \"prod\" or \"staging\"."
  }
}

variable "location" {
  description = "Timeweb location code used to pick the server configurator. ru-3 is Moscow."
  type        = string
  default     = "ru-3"
}

variable "availability_zone" {
  description = "Availability zone for the server and its floating IP; must belong to `location`."
  type        = string
  default     = "msk-1"
}

variable "server" {
  description = "Server size for a custom (configurator-based) Ultra NVMe server."
  type = object({
    cpu  = number
    ram  = number # MB
    disk = number # MB
  })
  default = {
    cpu  = 1
    ram  = 2048
    disk = 15360
  }
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to reach SSH (port 22). Keep this to your own IP(s), never 0.0.0.0/0."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0
    error_message = "admin_cidrs must not be empty, or SSH would be unreachable from anywhere."
  }
}

variable "admin_ssh_public_key" {
  description = "Public SSH key (contents of ~/.ssh/id_ed25519.pub). Installed for the \"deploy\" user."
  type        = string
}

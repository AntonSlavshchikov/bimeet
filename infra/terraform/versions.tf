terraform {
  required_version = ">= 1.5"

  required_providers {
    twc = {
      source  = "timeweb-cloud/timeweb-cloud"
      version = "~> 1.8"
    }
  }
}

# State is a local file (terraform.tfstate, git-ignored). One person runs
# Terraform for this project, so a remote backend with locking would only add
# a paid bucket and another set of keys. Keep a copy of the state file
# somewhere safe: without it Terraform no longer knows what it created.

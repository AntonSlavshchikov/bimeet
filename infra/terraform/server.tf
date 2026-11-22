resource "twc_project" "bimeet" {
  name        = "bimeet-${var.environment}"
  description = "Bimeet, managed by Terraform (infra/terraform)."
}

data "twc_os" "ubuntu" {
  name    = "ubuntu"
  version = "24.04"
}

# Custom size instead of a fixed preset: 1 CPU / 2 GB / 15 GB is not a preset,
# and it is the cheapest size that fits the whole docker-compose stack.
#
# Line: Ultra (NVMe, 3.3 GHz, Moscow). Premium in ru-3 is pre-order only,
# Ultra is the line that can be ordered. Provider 1.8.4 can't select Ultra
# through data "twc_configurator": preset_type accepts only
# premium|standard|gpu|dedicated_cpu, and the remaining filters (location,
# cpu_frequency, disk_type) match Premium as well. So the ID is pinned, as
# returned by GET https://api.timeweb.cloud/api/v1/configurator/servers:
# id 159, location "ru-3", tags ["ultra_msk_nvme"], cpu 1-104, ram from
# 1024 step 1024, disk from 15360 step 5120 (MB).
locals {
  ultra_configurator_id = 159
}

resource "twc_ssh_key" "deploy" {
  name = "bimeet-${var.environment}-deploy"
  body = var.admin_ssh_public_key
}

# Created before the server and passed in via floating_ip_id: cloud-init
# installs Docker on first boot, so the server needs a public address from the
# very start. Binding the IP after creation would leave cloud-init offline.
resource "twc_floating_ip" "main" {
  availability_zone = var.availability_zone
  comment           = "bimeet-${var.environment}"
}

resource "twc_server" "bimeet" {
  name              = "bimeet-${var.environment}"
  hostname          = "bimeet-${var.environment}"
  project_id        = twc_project.bimeet.id
  os_id             = data.twc_os.ubuntu.id
  availability_zone = var.availability_zone
  floating_ip_id    = twc_floating_ip.main.id
  ssh_keys_ids      = [twc_ssh_key.deploy.id]

  is_root_password_required = false

  configuration {
    configurator_id = local.ultra_configurator_id
    cpu             = var.server.cpu
    ram             = var.server.ram
    disk            = var.server.disk
  }

  # Runs only on first boot. Editing the template later changes nothing on a
  # running server, so it is ignored here instead of showing a diff forever.
  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_ssh_public_key = var.admin_ssh_public_key
  })

  lifecycle {
    # The server's disk holds Postgres and the uploaded files: never let a
    # plan replace it by accident.
    prevent_destroy = true
    ignore_changes  = [cloud_init, os_id]

    # Configurator 159 exists only in ru-3: fail at plan time, not at apply.
    precondition {
      condition     = var.location == "ru-3"
      error_message = "Ultra configurator 159 is Moscow (ru-3) only; look up the configurator for ${var.location} in GET /api/v1/configurator/servers."
    }
  }
}

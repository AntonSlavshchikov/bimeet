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
data "twc_configurator" "premium" {
  location    = var.location
  preset_type = "premium" # the NVMe line, the only one offered in Moscow
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
    configurator_id = data.twc_configurator.premium.id
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
  }
}

data "openstack_images_image_v2" "ubuntu" {
  name        = "Ubuntu 24.04 LTS 64-bit" # TODO verify: exact image name as published in the ru-9 pool image catalog; Selectel renames/versions these periodically.
  most_recent = true
}

data "openstack_compute_flavor_v2" "vm" {
  vcpus = var.vm_flavor.vcpus
  ram   = var.vm_flavor.ram
}

resource "openstack_compute_keypair_v2" "deploy" {
  name       = "bimeet-${var.environment}-deploy"
  public_key = var.admin_ssh_public_key
}

resource "openstack_blockstorage_volume_v3" "boot" {
  name              = "bimeet-${var.environment}-boot"
  size              = var.vm_flavor.disk
  image_id          = data.openstack_images_image_v2.ubuntu.id
  volume_type       = "fast.${var.availability_zone}" # TODO verify: exact volume_type naming for SSD network volumes in this AZ.
  availability_zone = var.availability_zone

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [image_id] # A newer Ubuntu image must not silently recreate the boot volume.
  }
}

resource "openstack_compute_instance_v2" "bimeet" {
  name              = "bimeet-${var.environment}"
  flavor_id         = data.openstack_compute_flavor_v2.vm.id
  key_pair          = openstack_compute_keypair_v2.deploy.name
  availability_zone = var.availability_zone
  security_groups   = [openstack_networking_secgroup_v2.bimeet.name]

  block_device {
    uuid                  = openstack_blockstorage_volume_v3.boot.id
    source_type           = "volume"
    destination_type      = "volume"
    boot_index            = 0
    delete_on_termination = false
  }

  network {
    uuid = openstack_networking_network_v2.bimeet.id
  }

  # Only takes effect on first boot of a NEW instance — user_data is
  # ForceNew on this resource, and prevent_destroy above blocks exactly
  # that, so a later edit here is refused at apply time rather than
  # silently recreating prod. See README "Changing cloud-init".
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_ssh_public_key = var.admin_ssh_public_key
    pg_backup_script     = file("${path.module}/../backup/pg_backup.sh")
    pg_restore_script    = file("${path.module}/../backup/pg_restore.sh")
    backup_service_unit  = file("${path.module}/../backup/bimeet-backup.service")
    backup_timer_unit    = file("${path.module}/../backup/bimeet-backup.timer")
    backup_s3_bucket     = aws_s3_bucket.backups.bucket
    backup_s3_endpoint   = "https://s3.${var.region}.storage.selcloud.ru"
    backup_s3_access_key = selectel_iam_s3_credentials_v1.backup.access_key
    backup_s3_secret_key = selectel_iam_s3_credentials_v1.backup.secret_key
    backup_s3_region     = var.region
  })

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [block_device] # Replacing the volume must be a deliberate, separate step, not a side effect of an unrelated apply.
  }

  depends_on = [openstack_networking_router_interface_v2.bimeet]
}

resource "openstack_networking_floatingip_v2" "bimeet" {
  pool = data.openstack_networking_network_v2.external.name
}

resource "openstack_networking_floatingip_associate_v2" "bimeet" {
  floating_ip = openstack_networking_floatingip_v2.bimeet.address
  port_id     = openstack_compute_instance_v2.bimeet.network[0].port
}

# Selectel's shared external network, used as the router's gateway and as
# the pool floating IPs come from. It's a fixed service network, not
# something this configuration creates.
# TODO verify: name confirmed as "external-network" in Selectel's Terraform
# examples (docs.selectel.ru/en/terraform/examples/cloud-networks/); reconfirm
# it is still called that in the target project/region before first apply.
data "openstack_networking_network_v2" "external" {
  name     = "external-network"
  external = true
}

resource "openstack_networking_network_v2" "bimeet" {
  name           = "bimeet-${var.environment}"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "bimeet" {
  name            = "bimeet-${var.environment}"
  network_id      = openstack_networking_network_v2.bimeet.id
  cidr            = "10.10.0.0/24"
  ip_version      = 4
  dns_nameservers = ["188.93.16.19", "188.93.17.19"] # TODO verify: Selectel's recommended internal resolvers.
}

resource "openstack_networking_router_v2" "bimeet" {
  name                = "bimeet-${var.environment}"
  admin_state_up      = true
  external_network_id = data.openstack_networking_network_v2.external.id
}

resource "openstack_networking_router_interface_v2" "bimeet" {
  router_id = openstack_networking_router_v2.bimeet.id
  subnet_id = openstack_networking_subnet_v2.bimeet.id
}

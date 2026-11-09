resource "openstack_networking_secgroup_v2" "bimeet" {
  name                 = "bimeet-${var.environment}"
  description          = "Bimeet prod VM: SSH from admin_cidrs only, HTTP/HTTPS from anywhere, nothing else inbound."
  delete_default_rules = true
}

resource "openstack_networking_secgroup_rule_v2" "ssh" {
  for_each = toset(var.admin_cidrs)

  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = each.value
  security_group_id = openstack_networking_secgroup_v2.bimeet.id
}

resource "openstack_networking_secgroup_rule_v2" "http" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.bimeet.id
}

resource "openstack_networking_secgroup_rule_v2" "https" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.bimeet.id
}

resource "openstack_networking_secgroup_rule_v2" "icmp" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "icmp"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.bimeet.id
}

# Outbound is left open — the VM needs it to pull Docker images, hit
# Let's Encrypt, and reach apt/pip/npm mirrors for package updates.
resource "openstack_networking_secgroup_rule_v2" "egress_v4" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.bimeet.id
}

# No IPv6 rules: the network/subnet in network.tf is IPv4-only, so there is
# nothing to open here unless IPv6 is configured explicitly later.

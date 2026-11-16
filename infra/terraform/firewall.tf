# Cloud firewall in front of the server. ufw inside the VM (cloud-init) is a
# second layer; this one is the real perimeter, because ports published by
# Docker bypass ufw.
resource "twc_firewall" "bimeet" {
  name        = "bimeet-${var.environment}"
  description = "SSH from admin IPs, HTTP/HTTPS from anywhere."

  link {
    id   = twc_server.bimeet.id
    type = "server"
  }
}

resource "twc_firewall_rule" "ssh" {
  for_each = toset(var.admin_cidrs)

  firewall_id = twc_firewall.bimeet.id
  direction   = "ingress"
  protocol    = "tcp"
  port        = "22"
  cidr        = each.value
  description = "SSH, admin only"
}

resource "twc_firewall_rule" "web" {
  for_each = toset(["80", "443"])

  firewall_id = twc_firewall.bimeet.id
  direction   = "ingress"
  protocol    = "tcp"
  port        = each.value
  cidr        = "0.0.0.0/0"
  description = "HTTP/HTTPS (Traefik)"
}

resource "twc_firewall_rule" "icmp" {
  firewall_id = twc_firewall.bimeet.id
  direction   = "ingress"
  protocol    = "icmp"
  cidr        = "0.0.0.0/0"
  description = "ping"
}

# Outbound is opened explicitly so it doesn't depend on the group's default
# policy: the server pulls images, apt updates and Let's Encrypt certificates.
resource "twc_firewall_rule" "egress" {
  for_each = toset(["tcp", "udp", "icmp"])

  firewall_id = twc_firewall.bimeet.id
  direction   = "egress"
  protocol    = each.value
  cidr        = "0.0.0.0/0"
  description = "all outbound ${each.value}"
}

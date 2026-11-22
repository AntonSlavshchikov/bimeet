# Cloud firewall in front of the server. ufw inside the VM (cloud-init) is a
# second layer; this one is the real perimeter, because ports published by
# Docker bypass ufw.
#
# SSH is open to admin_cidrs, which is 0.0.0.0/0 in practice (see
# variables.tf): CI deploys over SSH from GitHub runners with changing IPs.
# Access is guarded by key-only auth, disabled root login and fail2ban.
resource "twc_firewall" "bimeet" {
  name        = "bimeet-${var.environment}"
  description = "SSH (key-only), HTTP/HTTPS and TURN."

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
  description = "SSH, key-only auth"
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

# coturn (STUN/TURN) for 1:1 calls, see docs/adr/0005-calls-p2p-webrtc.md.
# 3478 over UDP and TCP (TCP for networks that block UDP), plus the UDP
# relay range — must match min-port/max-port in deploy/turnserver.conf.
resource "twc_firewall_rule" "turn" {
  for_each = {
    "udp-3478"  = { protocol = "udp", port = "3478" }
    "tcp-3478"  = { protocol = "tcp", port = "3478" }
    "udp-relay" = { protocol = "udp", port = "49160-49200" }
  }

  firewall_id = twc_firewall.bimeet.id
  direction   = "ingress"
  protocol    = each.value.protocol
  port        = each.value.port
  cidr        = "0.0.0.0/0"
  description = "coturn ${each.key}"
}

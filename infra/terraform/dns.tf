# Current (v2) Selectel DNS Hosting API resources — selectel_domains_zone_v2
# / selectel_domains_rrset_v2 — not the deprecated v1 domain/record pair.
resource "selectel_domains_zone_v2" "bimeet" {
  name       = "${var.domain}."
  project_id = selectel_vpc_project_v2.bimeet.id
}

locals {
  # All point at the one VM. "@", "www" (landing) and "app" (frontend) must
  # match the Traefik Host() rules in docker-compose.prod.yml, otherwise the
  # site goes dark right after the NS switch. "api" and "staging" are not
  # used by anything deployed today (the backend is only reachable through
  # the frontend's nginx /api/ proxy, see frontend/nginx.conf; there is no
  # separate staging environment) but are provisioned ahead of time.
  a_record_hosts = ["@", "www", "app", "api", "staging"]
}

resource "selectel_domains_rrset_v2" "a" {
  for_each = toset(local.a_record_hosts)

  zone_id    = selectel_domains_zone_v2.bimeet.id
  name       = each.value == "@" ? "${var.domain}." : "${each.value}.${var.domain}."
  type       = "A"
  ttl        = 300
  project_id = selectel_vpc_project_v2.bimeet.id

  records {
    content = openstack_networking_floatingip_v2.bimeet.address
  }
}

# Lets ACME HTTP-01 validation succeed for letsencrypt.org only.
resource "selectel_domains_rrset_v2" "caa" {
  zone_id    = selectel_domains_zone_v2.bimeet.id
  name       = "${var.domain}."
  type       = "CAA"
  ttl        = 300
  project_id = selectel_vpc_project_v2.bimeet.id

  records {
    content = "0 issue \"letsencrypt.org\""
  }
}

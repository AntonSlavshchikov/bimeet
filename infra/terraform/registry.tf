# Replaces GHCR (see README "Next steps" for the .github/workflows/deploy.yml
# changes needed to push here instead).
resource "selectel_craas_registry_v1" "bimeet" {
  name       = "bimeet-${var.environment}"
  project_id = selectel_vpc_project_v2.bimeet.id
}

# TODO verify: the provider docs for selectel_craas_registry_v1 list no
# cleanup/retention argument or sibling resource for "keep last N tags" —
# only selectel_craas_token_v2 (registry auth tokens) exists alongside it.
# If Selectel adds a retention-policy resource, wire it up here. Until then,
# tag cleanup has to be done through the Container Registry UI/API, noted
# in README "Next steps".

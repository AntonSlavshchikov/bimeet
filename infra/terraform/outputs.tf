output "floating_ip" {
  description = "Public IPv4 address of the Bimeet VM."
  value       = openstack_networking_floatingip_v2.bimeet.address
}

output "registry_endpoint" {
  description = "Container Registry endpoint, e.g. cr.selcloud.ru/bimeet-prod."
  value       = selectel_craas_registry_v1.bimeet.endpoint
}

output "uploads_bucket" {
  description = "Name of the Object Storage bucket for user uploads (avatars, receipts, chat images)."
  value       = aws_s3_bucket.uploads.bucket
}

output "backups_bucket" {
  description = "Name of the Object Storage bucket for database backups."
  value       = aws_s3_bucket.backups.bucket
}

output "s3_endpoint" {
  description = "S3-compatible endpoint for both buckets."
  value       = "https://s3.${var.region}.storage.selcloud.ru"
}

output "dns_zone_id" {
  description = "Selectel DNS zone ID for the domain. selectel_domains_zone_v2 does not export the NS server list — look it up in the control panel (Domains -> your zone) or via the Domains API using this zone ID, then set those NS records at the registrar. See README \"DNS cutover\"."
  value       = selectel_domains_zone_v2.bimeet.id
}

output "app_s3_access_key" {
  description = "Access key for the uploads bucket — put in GitHub Secrets / backend env as S3_ACCESS_KEY."
  value       = selectel_iam_s3_credentials_v1.app.access_key
  sensitive   = true
}

output "app_s3_secret_key" {
  description = "Secret key for the uploads bucket — put in GitHub Secrets / backend env as S3_SECRET_KEY."
  value       = selectel_iam_s3_credentials_v1.app.secret_key
  sensitive   = true
}

output "backup_s3_access_key" {
  description = "Access key for the backups bucket — used by the backup script, not by the app."
  value       = selectel_iam_s3_credentials_v1.backup.access_key
  sensitive   = true
}

output "backup_s3_secret_key" {
  description = "Secret key for the backups bucket — used by the backup script, not by the app."
  value       = selectel_iam_s3_credentials_v1.backup.secret_key
  sensitive   = true
}

output "ci_serviceuser_name" {
  description = "Service user name CI authenticates as to push/pull from the Container Registry — put in GitHub Secrets as part of CRAAS_USERNAME."
  value       = selectel_iam_serviceuser_v1.ci.name
}

output "ci_serviceuser_password" {
  description = "Service user password CI authenticates with — put in GitHub Secrets as CRAAS_PASSWORD."
  value       = var.ci_serviceuser_password
  sensitive   = true
}

output "server_ip" {
  description = "Public IPv4 of the server: A records for @, www, app, s3 point here; also the SSH_HOST secret."
  value       = twc_floating_ip.main.ip
}

output "server_id" {
  description = "Timeweb server ID, for the panel and API."
  value       = twc_server.bimeet.id
}

output "ssh_command" {
  description = "How to log in once cloud-init has finished (a few minutes after creation)."
  value       = "ssh deploy@${twc_floating_ip.main.ip}"
}

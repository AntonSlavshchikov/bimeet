# Replaces MinIO (see README "Next steps" for the app-side migration).
#
# Two buckets, two service users, two sets of S3 credentials — one pair per
# workload, so a leaked backup-script key can't touch uploads and vice versa.
#
# TODO verify / known limitation: Selectel's S3 credentials
# (selectel_iam_s3_credentials_v1) are issued per service user + project,
# not per bucket — nothing in the provider or the Object Storage docs scopes
# a key to a single bucket. Separate service users is the closest available
# mitigation (independent rotation/revocation), not true bucket isolation.
# If Selectel adds bucket-scoped policies, tighten this.

resource "selectel_iam_serviceuser_v1" "app" {
  name     = "bimeet-app-${var.environment}"
  password = var.app_serviceuser_password

  role {
    role_name  = "member"
    scope      = "project"
    project_id = selectel_vpc_project_v2.bimeet.id
  }
}

resource "selectel_iam_serviceuser_v1" "backup" {
  name     = "bimeet-backup-${var.environment}"
  password = var.backup_serviceuser_password

  role {
    role_name  = "member"
    scope      = "project"
    project_id = selectel_vpc_project_v2.bimeet.id
  }
}

resource "selectel_iam_s3_credentials_v1" "app" {
  name       = "bimeet-app-${var.environment}"
  user_id    = selectel_iam_serviceuser_v1.app.id
  project_id = selectel_vpc_project_v2.bimeet.id
}

resource "selectel_iam_s3_credentials_v1" "backup" {
  name       = "bimeet-backup-${var.environment}"
  user_id    = selectel_iam_serviceuser_v1.backup.id
  project_id = selectel_vpc_project_v2.bimeet.id
}

# --- Uploads bucket -----------------------------------------------------
# Private — no public-read policy. As of the backend's GET /api/files/{key}
# redirect (handler/files), the app itself mints a short-lived presigned
# GET on every request instead of exposing a permanently public object URL.
# No CORS config: uploads are still a server-side PutObject
# (backend/internal/storage/s3.go), never a browser-side PUT.
resource "aws_s3_bucket" "uploads" {
  bucket = "bimeet-${var.environment}-uploads"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Disabled"
  }
}

# --- Backups bucket -------------------------------------------------------
# Private. Nothing writes to it yet (see README "Next steps" — pg_dump cron
# job); the lifecycle rule below is already in place so backups don't
# accumulate forever once that lands.
resource "aws_s3_bucket" "backups" {
  bucket = "bimeet-${var.environment}-backups"
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-after-14-days"
    status = "Enabled"
    filter {}
    expiration {
      days = 14
    }
  }
}

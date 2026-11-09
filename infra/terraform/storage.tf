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
# Mirrors the current MinIO setup: the backend does a server-side
# PutObject and hands back a public URL (backend/internal/storage/s3.go) —
# there is no presigned-upload flow and no browser-side PUT, so no CORS
# config is needed here. Because the app returns bare public URLs, object
# GET has to stay publicly readable; nothing else (listing, writes) is public.
resource "aws_s3_bucket" "uploads" {
  bucket = "bimeet-${var.environment}-uploads"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket = aws_s3_bucket.uploads.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
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

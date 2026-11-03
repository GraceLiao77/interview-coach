# Printed after `terraform apply`, and any time with `terraform output`
output "bucket_name" {
  value = aws_s3_bucket.client.bucket
}

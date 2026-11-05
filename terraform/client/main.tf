# A data source only reads something that already exists: here, the AWS account id.
data "aws_caller_identity" "current" {}

# The bucket that will hold the built client (client/dist).
# Bucket names are global across all AWS accounts, so the account id keeps this one unique.
# A bucket can't be renamed: changing this name means Terraform deletes it and creates a new one.

# resource 创建
resource "aws_s3_bucket" "client_bucket" {
  bucket = "interview-coach-client-bucket-${data.aws_caller_identity.current.account_id}"
}
# Bucket names are global across all AWS accounts, so the account id keeps this one unique.

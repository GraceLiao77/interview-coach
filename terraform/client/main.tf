# A data source reads something that already exists; it creates nothing.
# Here: which AWS account the current credentials belong to.
data "aws_caller_identity" "current" {}

# The bucket that will hold the built client (client/dist).
# Bucket names are global across every AWS account, so the account id keeps this one unique.
resource "aws_s3_bucket" "client" {
  bucket = "interview-coach-client-${data.aws_caller_identity.current.account_id}"
}

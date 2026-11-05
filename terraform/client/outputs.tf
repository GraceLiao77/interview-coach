# 3. outputs.tf：执行完后打印什么

# - 输出 bucket 的名字，后面上传文件时要用

output "bucket_name" {
  value = aws_s3_bucket.client_bucket.bucket
}

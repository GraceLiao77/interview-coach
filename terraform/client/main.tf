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

resource "aws_s3_bucket_public_access_block" "client_bucket" {
  bucket                  = aws_s3_bucket.client_bucket.id #类型（aws provider规定）.我取的名字.属性
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 钥匙：cloudfront 访问仓库时出示
resource "aws_cloudfront_origin_access_control" "client_distribution" {
  name                              = "interview-coach-client-bucket-${data.aws_caller_identity.current.account_id}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
data "aws_cloudfront_cache_policy" "client_distribution" {
  name = "Managed-CachingOptimized"
}
# CDN本身resource
resource "aws_cloudfront_distribution" "client_distribution" {
  enabled             = true
  default_root_object = "index.html"

  # ① origin：去哪里拿文件
  origin {
    domain_name              = aws_s3_bucket.client_bucket.bucket_regional_domain_name # bucket 的地址
    origin_id                = "s3-client-bucket-G"
    origin_access_control_id = aws_cloudfront_origin_access_control.client_distribution.id # 带上 2b-1 的"钥匙"
  }                                                                                        # aws_cloudfront_origin_access_control.client_distribution -> OAC钥匙，给每个请求签名


  # ② 默认的缓存规则：所有请求都按这个处理
  default_cache_behavior {
    target_origin_id       = "s3-client-bucket-G"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.client_distribution.id # 缓存多久？用 AWS 现成的策略
  }

  # ③ 地区限制：哪些国家可以访问
  restrictions {
    geo_restriction {
      restriction_type = "none" # 全世界都能访问
    }
  }

  # ④ https 证书
  viewer_certificate {
    cloudfront_default_certificate = true # 用 *.cloudfront.net 自带的免费证书
  }
}

# 如果只改名 需要执行moved 模块,像数据库 migration 里的 RENAME COLUMN：不写的话，Prisma 会以为你删了一列、加了一列，数据就没了。
# 写了，它就知道是改名。而且 moved 写在代码里，会被 commit、被 review，团队里每个人 apply 时都会生效。
# 它不知道这两个是同一把钥匙改了名。这就是之前说的"apply 之后再改名 = 删掉再重建"，现在真的遇到了 😄
# 这次为什么有风险？
# 新旧两把钥匙的 name 都是 interview-coach-client-bucket-388260576938，而 OAC 的 name 在账号里必须唯一。
# 如果 Terraform 先创建新的、再删旧的，就会报错 already exists，apply 做到一半失败。
moved {
  from = aws_cloudfront_origin_access_control.client_bucket
  to   = aws_cloudfront_origin_access_control.client_distribution
}
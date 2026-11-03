# Which Terraform and which provider versions this config is written for.
# "~> 6.0" means any 6.x, never 7.0: a major version can change how resources behave.
terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# Credentials come from `aws login` on the owner's machine; nothing secret is written here.
# The region is set in code, so the AWS CLI's default region doesn't matter to Terraform.
provider "aws" {
  region = "ap-southeast-2" # Sydney (ADR 0004)

  # Added to every resource this config creates, so they're easy to find in the console and on the bill
  default_tags {
    tags = {
      Project   = "interview-coach"
      ManagedBy = "terraform"
    }
  }
}

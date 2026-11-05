terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # any 6.x, never 7.0: a major version can change how resources behave
    }
  }
}
provider "aws" {
  region = "ap-southeast-2"
  default_tags {
    tags = {
      Project = "interview-coach"
    }
  }
}


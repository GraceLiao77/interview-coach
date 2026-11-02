# The backend deploys to Google Cloud Run; the frontend stays on AWS

The plan was AWS throughout: S3 + CloudFront for the client and App Runner for the server. App Runner stopped accepting new customers on 30 April 2026, and the owner's AWS account was created after that, so it can't use App Runner. The backend now runs as a Docker container on Google Cloud Run in `asia-northeast1` (Tokyo), with the maximum number of instances set to 1. The frontend stays on S3 + CloudFront. Both are described in Terraform, with the AWS and Google providers.

The backend is in Tokyo, not Sydney, because the Supabase database is in `ap-northeast-1` (Tokyo). One request from the browser crosses to the backend once, but the backend then queries the database several times, and Sydney to Tokyo is roughly 100 ms each way and back. So the backend sits next to the database: a request from New Zealand pays the long trip once instead of on every query. Moving the database to Sydney instead would mean a new Supabase project and a data migration, which isn't worth it yet. The S3 bucket is in Sydney; CloudFront serves the files from edge locations near each visitor anyway.

Two things decided it. First, the Demo Interview is static: it's bundled into the client and makes no API calls. Recruiters only ever load the frontend, so the frontend has to be always on and fast, while the backend serves only the owner and can sleep. Cloud Run scales to zero when idle, so occasional use by one person fits inside its free tier, and a cold start of a few seconds only ever costs the owner. Second, the project is also how the owner learns the skills New Zealand job ads ask for: PostgreSQL, Terraform, Docker and AWS. This split still covers Terraform (two providers), Docker, S3, CloudFront and IAM.

## Considered Options

- **AWS ECS on Fargate behind a load balancer.** Deferred. It's the most common way to run containers in the job ads, but the load balancer alone costs more than ten US dollars a month, which would use up the AWS free plan's US$100 credit in a few months. The same Docker image can be deployed to ECS later, with Terraform, for an afternoon and then destroyed, to learn it for a few dollars.
- **ECS Express Mode** (AWS's suggested replacement for App Runner). Rejected for now: it sets up the load balancer and networking itself, so it costs as much as ECS while teaching less.
- **AWS Lambda.** Rejected. Express would need an adapter; the in-memory rate limits would be wrong across several instances; and the request body limit (about 6 MB) is below the 25 MB audio upload cap.
- **Vercel functions.** Rejected for the backend for the same reasons: a request body limit of about 4.5 MB, and several instances.
- **Cloudflare Workers.** Rejected. It isn't a Node runtime, so Express, multer and Prisma would all need rewriting.
- **Render.** Rejected. It would run the server unchanged, but its free tier sleeps for tens of seconds and it's less common in job ads than Cloud Run or AWS.
- **Moving the frontend off AWS too** (Cloudflare Pages or Vercel would be simpler). Rejected: S3 + CloudFront is the AWS practice the owner wants.

## Consequences

- `env.ts` must start without a `.env` file, because Cloud Run sets environment variables directly. Once it does, CI no longer needs `cp .env.example .env`.
- Secrets (database URLs, JWT secret, API keys) go into Google Secret Manager and reach the container as environment variables; they never go into the image or the Terraform files.
- The client's API base URL can't stay hard-coded to `localhost:3009`, and the server's CORS has to allow the CloudFront domain.
- Rate limits stay in memory, which is only correct while there is one instance. Raising the instance limit means moving them to a shared store first.
- There are two cloud accounts to look after: AWS (free plan until 2 May 2027; an account that isn't upgraded by then is deleted 90 days later) and Google Cloud (needs a billing account for the free tier).
- The backend's region follows the database. If the database ever moves (to Sydney, say), the Cloud Run region moves with it.

# Deployment Checklist

## Environment Variables
The following environment variables are required for the application to run:

### Authentication (NextAuth)
- `NEXTAUTH_URL`: The canonical URL of your site (e.g., `https://your-project.vercel.app`).
- `NEXTAUTH_SECRET`: A random string used to hash tokens (generate one with `openssl rand -base64 32`).

### Google Integration
- `GOOGLE_CLIENT_ID`: From Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.

### Analytics (PostHog) - Optional but Recommended
- `NEXT_PUBLIC_POSTHOG_KEY`: Project API Key from PostHog.
- `NEXT_PUBLIC_POSTHOG_HOST`: Instance URL (usually `https://us.i.posthog.com` or `https://eu.i.posthog.com`).

## Deployment Steps (Vercel)
1. Push your code to a Git repository (GitHub/GitLab).
2. Import the project in Vercel.
3. In the "Environment Variables" section during import (or in Settings later), add all the variables listed above.
4. Deploy.

## Deployment Steps (Docker)
1. Build the image: `docker build -t lcal .`
2. Run container: `docker run -p 3000:3000 --env-file .env.local lcal`

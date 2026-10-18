# thermoRezepte

thermoRezepte turns recipe photos into structured, Thermomix-oriented step-by-step instructions. Signed-in users can upload an image, select their Thermomix version, and access the generated recipes in their collection.

## Features

- Capture a recipe photo through file upload or the camera
- Compress the image before uploading it to Supabase Storage
- Extract ingredients, times, temperatures, and speeds from the image with OpenAI
- Generate instructions suitable for TM5, TM6, or TM7
- Save recipes with their processing status and view them later
- Sign in with email/password or Google through Supabase Auth
- Optional Pro subscription through Stripe

## Tech stack

- **Web:** Next.js 15, React 19, TypeScript, and Tailwind CSS
- **Backend:** Next.js Route Handlers and Supabase Edge Functions (Deno)
- **Data:** Supabase Auth, Postgres, and Storage
- **AI:** OpenAI Vision through the Chat Completions API
- **Payments:** Stripe Checkout and webhooks
- **Package manager:** pnpm 9 (workspace monorepo)

## Project structure

```text
.
├── apps/web/                         # Next.js application
│   ├── src/app/                       # Pages and API routes
│   ├── src/components/                # UI and landing-page components
│   └── .env.example                   # Template for local variables
├── supabase/
│   └── functions/convert-image-to-tm/ # Edge Function for recipe conversion
├── package.json                       # Workspace scripts
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js 20 or later
- pnpm 9.12.3 (`corepack enable` enables Corepack in current Node.js versions)
- A Supabase project
- An OpenAI API key
- A Stripe account for subscriptions
- Optionally, the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) to deploy the Edge Function

## Run locally

```bash
corepack enable
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

The application is then available at [http://localhost:3000](http://localhost:3000).

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Check TypeScript |
| `pnpm verify` | Run linting, type checks, and the build |
| `pnpm format` | Format the web app with Prettier |

## Configuration

Add the following variables to `apps/web/.env.local`. `apps/web/.env.example` contains the public base variables; the server-side secrets listed here are also required for full functionality.

| Variable | Required for | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web app | Public base URL; locally, `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase clients | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and auth | Public Supabase anon key |
| `SUPABASE_URL` | Stripe webhook | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server and webhook | Supabase service-role key; never expose it in the browser |
| `INTERNAL_SECRET` | Recipe processing | Shared secret between the Next.js API and Edge Function |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pricing page | Public Stripe key |
| `STRIPE_SECRET_KEY` | Checkout and webhook | Secret Stripe key |
| `STRIPE_PRICE_ID` | Checkout | Recurring Stripe Price ID |
| `STRIPE_WEBHOOK_SECRET` | Webhook | Signing secret for the Stripe webhook endpoint |

The Edge Function requires its own secrets:

```bash
supabase secrets set \
  OPENAI_API_KEY="..." \
  INTERNAL_SECRET="..." \
  SUPABASE_SERVICE_ROLE_KEY="..."
```

`SUPABASE_URL` is provided in the hosted Supabase Function environment. `INTERNAL_SECRET` must exactly match the value in `apps/web/.env.local`.

## Set up Supabase

This repository currently contains no database migrations. Before starting the app, create the resources used below in the selected Supabase project and configure appropriate row-level security policies:

- A `raw_uploads` bucket for uploaded images
- A `users` table with at least `id`, `email`, `thermomix_version`, and `stripe_customer_id`
- A `recipes` table with at least `id`, `user_id`, `image_path`, `title`, `recipe_json`, `status`, `error_message`, and `created_at`; `image_path` is used as the conflict key by the Function
- An `entitlements` table with at least `user_id`, `key`, `source`, `status`, `stripe_price_id`, `stripe_subscription_id`, `current_period_end`, and `last_event_at`; upserts require a unique key over `user_id`, `key`, and `source`

Users must only be able to access their own recipe rows and files below `raw_uploads/<auth-user-id>/...`. The Edge Function uses the service role and performs server-side processing.

### Deploy the Edge Function

After linking the Supabase CLI to the project:

```bash
supabase functions deploy convert-image-to-tm
```

The Function verifies the internal secret, creates a short-lived signed URL for the uploaded image, calls OpenAI, and writes the processing status or result to `recipes`.

## Set up Stripe

1. Create a recurring price in Stripe and set its ID as `STRIPE_PRICE_ID`.
2. Configure a webhook at `https://<your-domain>/api/stripe-webhook`.
3. For local testing, forward the Stripe CLI listener to this route and set the resulting signing secret as `STRIPE_WEBHOOK_SECRET`.

The webhook links Stripe customers to `users` and maintains the Pro status in `entitlements`.

## Recipe-processing flow

```text
Browser → Supabase Storage → /api/parse → Supabase Edge Function → OpenAI
                                       ↓                         ↓
                                    Processing status       `recipes` table
                                       ↓
                                  Recipe view in browser
```

## Notes

- Generated content is AI-created. Always check quantities, times, temperatures, and safety instructions before cooking.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `INTERNAL_SECRET` belong only in server-side secret management or local, untracked environment files.
- Cookidoo and Thermomix are trademarks of their respective owners; this project is not presented as an official service of either brand.

## License

No license has been specified for this repository.

# CFA Applications Dashboard

Internal executive dashboard for the Cinema Foundation of Armenia application review board:
«Փաստաթղթերի ուսումնասիրություն».

The app is built with Next.js App Router so monday.com API access stays server-side.
The monday.com token is read only from `MONDAY_API_TOKEN` and is never exposed to browser code.

## Environment

Create a local `.env.local` file using `.env.example` as the template:

```sh
MONDAY_API_TOKEN=
MONDAY_BOARD_ID=5102823771
```

When `MONDAY_API_TOKEN` is not configured, the interface uses a clearly labelled development demo dataset.

## Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm run lint
npm run build
```

# Ticketto (チケット, lit. ticket)

An implementation of [The Ticketto Protocol](https://github.com/kippurocks/ticketto) for Web2.

## Getting Started

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:8000/openapi](http://localhost:8000/openapi) with your browser to see docs.

## Structure

The API is comprised of three modules: `common`, `events`, and `tickets`.

The `common` module contains the necessary codebase to set up a server and bootstrap the process and
some necessary middleware (like `auth-polkadot-signature` and `events-queue`).

Both `events` and `tickets` modules contain `application` code and `infrastructure` code. The first
comprises `calls` (Commands) and `storage` (Queries), conforming to CQRS pattern. Storage is exported
as GET paths on the server, while Calls are processed via authored extrinsics, and exposed on a
single endpoint path: `POST /transaction`. Finally, modules contain `repositories` to connect to
actual storage (in our case, Supabase).

> **Note about asynchrounism:**
>
> Responses to calls in ticketto protocol are supposed to be observed via events. This means, you
> author, then sign and submit an extrinsic (transaction) containing a `call`, and then subscribe
> to an events queue to observe the result of the extrinsic.
>
> Event subscriptions are subject to further implementation (either Websockets or SSEs, TBD). Once
> implemented, transaction endpoint will receive a transaction and either fail for bad signature,
> or close immediately, and esults of the sent transaction have to be observed via events.

```sh
common/
├─ infrastructure/
│  ├─ middleware/
│  ├─ server/
events/
├─ application/
│  ├─ calls/
│  ├─ storage/
├─ domain/
├─ infrastructure/
│  ├─ repositories/
events/
├─ application/
│  ├─ calls/
│  ├─ storage/
├─ domain/
├─ infrastructure/
│  ├─ repositories/
app.ts
```

The `app.ts` is the entry point and implements the common-ground server interface to inject both modules.

## Stack

- Inversify.js
- Koa.js
- Polkadot.js
- Supabase
- ws (TBD)
- fastq (TBD)

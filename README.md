# Kippu2

It's Kippu, but using Web2 technologies.

> Note: This repo will be properly moved to `kippu-apps` once the migration to Web3 is complete,
> deprecating `@kippu/ticketto-api-web2` and replacing integration to API with a polkadot client.

## What's inside?

This repo includes the following packages/apps:

### Apps and Packages

- `api`: An implementation of [The Ticketto Protocol][kippu:ticketto] for Web2.
- `ichiba`: This application serves as a point for showcasing events, and selling tickets.
- `iriguchi`: This application serves as the entry point control access.
- `saifu`: This application serves as a wallet for _ticket holders_ to collect, transfer, and resell
  tickets and gain access to events.
- `@kippu/ui`: a stub React component library shared by applications.
- `@kippu/eslint-config`: `eslint` configurations (includes `eslint-config-next` and
  `eslint-config-prettier`)
- `@kippu/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd kippu2
yarn build
```

### Develop

To develop all apps and packages, run the following command:

```
cd kippu2
yarn dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching][turbo:remote-caching] to share cache
artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with
Vercel. If you don't have an account you can [create one][vercel:signup], then enter the
following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account][vercel:account].

Next, you can link your Turborepo to your Remote Cache by running the following command from the
root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

[kippu:ticketto]: https://github.com/KippuRocks/ticketto/blob/main/PROTOCOL.md
[turbo:remote-caching]: https://turbo.build/repo/docs/core-concepts/remote-caching
[vercel:signup]: https://vercel.com/signup
[vercel:account]: https://vercel.com/docs/concepts/personal-accounts/overview

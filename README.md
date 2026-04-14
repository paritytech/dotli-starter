# dotli Starter Template

Simple dotli starter built with plain HTML, CSS, and JavaScript. It uses npm-installed packages and a Vite-style workflow, without React.

## Prerequisites

- Node.js >= 18

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

Builds the production app into `dist/`.

## Preview

```bash
npm run preview
```

Serves the built app locally from `dist/`. You can then open it in the Polkadot Desktop or under https://dot.li/localhost:4173.

Note:
- For host testing, prefer `build` + `preview` or a deployed `dist/` bundle. Vite dev mode can run into host CSP restrictions.

## Deploy

This starter uses [`bulletin-deploy`](https://github.com/paritytech/bulletin-deploy). The older local DotNS CLI deploy flow has been removed.

### Local deploy

Install `bulletin-deploy` and its IPFS prerequisite:

```bash
npm install -g bulletin-deploy

# macOS
brew install ipfs
ipfs init
```

Build and deploy:

```bash
npm run build
bulletin-deploy ./dist my-app00.dot
```

Your site will be live at `https://my-app00.dot.li`.

Notes:
- `bulletin-deploy` uses `MNEMONIC` for the DotNS owner mnemonic.
- On Paseo testnet, names like `my-app00.dot` do not require Proof of Personhood.
- To use a different Bulletin RPC, set `BULLETIN_RPC`.

Example:

```bash
export MNEMONIC="your twelve word mnemonic phrase goes here ..."
bulletin-deploy ./dist my-app00.dot
```
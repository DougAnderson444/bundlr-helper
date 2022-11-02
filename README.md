# Bundlr Helpers

Simple CLI helper function that checks to see if have enough coin to upload to Bundlr, and enables you up pay with Arweave if you don't have enough.

```cli
npm i github:douganderson444/bundlr-helper
```

## Usage

```js
import { readyBundlr } from '@douganderson444/bundlr-helper';

const isReady = await readyBundlr(bytes, jwk);

if (!isReady) return;

// Good to go
// post(tx)
```

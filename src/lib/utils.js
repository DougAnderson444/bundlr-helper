import * as b64 from '@stablelib/base64';
import { hash } from '@stablelib/sha256';

export async function getArweaveAddress(jwk) {
	if (!jwk || jwk === 'use_wallet') {
		try {
			// @ts-ignore
			await arweaveWallet.connect(['ACCESS_ADDRESS']);
		} catch {
			// Permission is already granted
		}
		return await window.arweaveWallet.getActiveAddress();
	}

	// get uint8array of the string
	const bytes = b64.decodeURLSafe(jwk.n);

	// get the isomorphic hash of the asset as the tag
	const hashed = hash(bytes); // make tag unique, so that it can go to a new owner without conflict
	const hashB64 = b64.encodeURLSafe(new Uint8Array(hashed)).replace('=', '');
	return hashB64;
}

// deploy ./bundled to bundlr
import Bundlr from '@bundlr-network/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import clc from 'cli-color';
import { getArweaveAddress } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const getTotalSize = function (directoryPath) {
	const arrayOfFiles = getAllFiles(directoryPath);

	let totalSize = 0;

	arrayOfFiles.forEach(function (filePath) {
		totalSize += fs.statSync(filePath).size;
	});

	return totalSize;
};

export const getAllFiles = function (dirPath, arrayOfFiles) {
	const files = fs.readdirSync(dirPath);

	arrayOfFiles = arrayOfFiles || [];

	files.forEach(function (file) {
		if (fs.statSync(dirPath + '/' + file).isDirectory()) {
			arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
		} else {
			arrayOfFiles.push(path.join(__dirname, dirPath, file));
		}
	});

	return arrayOfFiles;
};

export const convertBytes = function (bytes) {
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

	if (bytes == 0) {
		return 'n/a';
	}

	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

	if (i == 0) {
		return bytes + ' ' + sizes[i];
	}

	return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

export async function readyBundlr(bytes, jwk) {
	// get arweave address from jwk.n using utils/getArweaveAddress
	const address = await getArweaveAddress(jwk);

	const bundlr = new Bundlr.default('http://node1.bundlr.network', 'arweave', jwk);

	console.log(`Total Size ${bytes} bytes (${convertBytes(bytes)})`);

	// Only need to be concerned about anything over 100kb
	if (bytes < 100000) return true;

	const price = await bundlr.getPrice(bytes);
	const amount = bundlr.utils.unitConverter(price);

	console.log(`Price: ${price} (atomic units) ${amount} AR`);

	const balance = await bundlr.getLoadedBalance();

	// If you don't have enough balance for the upload
	if (balance.isLessThan(price)) {
		console.log('Balance', clc.redBright(balance));

		// not enough funds
		const fundAmt = price.minus(balance).multipliedBy(1.1).integerValue();

		// fetch balance from https://arweave.net/wallet/{address}/balance
		const arBalance = await fetch(`https://arweave.net/wallet/${address}/balance`).then((res) =>
			res.json()
		);

		if (!arBalance) {
			console.log(clc.redBright('Ar Balance is zero, fund your wallet address with Ar.', error));
			return false;
		}

		// calculate fundAmt as a % of arBalance
		const fundAmtPercent = fundAmt.dividedBy(arBalance).multipliedBy(100).toFixed(2);

		const fundMore = await inquirer.prompt([
			/* Pass your questions in here */
			{
				type: 'list',
				name: 'continue',
				message: clc.redBright(
					`\nBalance: ${balance}, not enough funds. Add ${fundAmt}? (${fundAmtPercent}% of your balance)\n`
				),
				choices: ['Yes', 'no']
			}
		]);

		if (fundMore.continue !== 'Yes') process.exit(0);
		// Fund your account with the difference
		// We multiply by 1.1 to make sure we don't run out of funds
		console.log(`Funding your account with the difference: `, fundAmt.valueOf());
		try {
			const fundData = await bundlr.fund(fundAmt.valueOf());
			console.log(
				'Done! Check back in 10 minutes after the transaction has completed. Tx id: ',
				clc.green.bold(fundData.id)
			);
		} catch (error) {
			console.log(clc.redBright('Error funding account', error));
		}

		process.exit(0);
	}

	console.log('Balance', clc.greenBright(balance));

	const answer = await inquirer.prompt([
		{
			type: 'list',
			name: 'continue',
			message: clc.greenBright('Check the details, complete this upload?'),
			choices: ['Yes', 'no']
		}
	]);

	return answer.continue == 'Yes';
}

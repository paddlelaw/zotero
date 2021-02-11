'use strict';

const fs = require('fs-extra');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { getSignatures, writeSignatures, onSuccess, onError } = require('./utils');
const { buildsURL } = require('./config');

async function getZoteroNoteEditor(signatures) {
	const t1 = Date.now();

	const { stdout } = await exec('git rev-parse HEAD', { cwd: './zotero-note-editor' });
	const hash = stdout.trim();

	if (!('zotero-note-editor' in signatures) || signatures['zotero-note-editor'].hash !== hash) {
		const targetDir = 'build/resource/zotero-note-editor/';
		try {
			const filename = hash + '.zip';
			const tmpDir = 'tmp/builds/zotero-note-editor/';
			const url = buildsURL + 'client-note-editor/' + filename;
			await exec(
				`mkdir -p ${tmpDir}`
				+ `&& cd ${tmpDir}`
				+ `&& (test -f ${filename} || curl -f ${url} -o ${filename})`
				+ `&& rm -rf ../../../${targetDir}`
				+ `&& mkdir -p ../../../${targetDir}`
				+ `&& unzip -o ${filename} -d ../../../${targetDir}`
			);
		}
		catch (e) {
			await exec('npm ci;npm run build', { cwd: 'zotero-note-editor' });
			await fs.copy('zotero-note-editor/build/zotero', targetDir);
		}
		signatures['zotero-note-editor'] = { hash };
	}
	
	const t2 = Date.now();

	return {
		action: 'zotero-note-editor',
		count: 1,
		totalCount: 1,
		processingTime: t2 - t1
	};
}

module.exports = getZoteroNoteEditor;

if (require.main === module) {
	(async () => {
		try {
			const signatures = await getSignatures();
			onSuccess(await getZoteroNoteEditor(signatures));
			await writeSignatures(signatures);
		}
		catch (err) {
			process.exitCode = 1;
			global.isError = true;
			onError(err);
		}
	})();
}

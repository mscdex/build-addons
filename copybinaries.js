'use strict';

const {
  appendFileSync,
  createReadStream,
  createWriteStream,
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require('fs');
const { join, resolve } = require('path');
const { createGzip } = require('zlib');

function setBinaryPath(path) {
  try {
    appendFileSync(process.env.GITHUB_ENV, `binary_path=${path}\n`);
  } catch (ex) {
    console.error(`Unable to set env variable: ${ex.message}`);
    process.exit(1);
  }
}

const repoPath = process.env.GITHUB_WORKSPACE;

const [ , , napiVer, platform, libc, binaryType ] = process.argv;

if (typeof napiVer !== 'string' || !napiVer) {
  console.error('Missing node API argument');
  process.exit(1);
}

if (typeof platform !== 'string' || !platform) {
  console.error('Missing platform argument');
  process.exit(1);
}

if (typeof libc !== 'string' || !libc) {
  console.error('Missing libc argument');
  process.exit(1);
}

const baseDir = resolve(join(repoPath, 'build'));
const outDir = join(baseDir, 'prepared');
const addonBaseDir = join(baseDir, 'Release');

let buildConfig = readFileSync(join(baseDir, 'config.gypi'));
buildConfig = buildConfig.slice(buildConfig.indexOf('{'));
buildConfig = JSON.parse(buildConfig).variables;

const {
  node_module_version: moduleVer,
  target_arch: arch,
} = buildConfig;

const { version } = require(join(repoPath, 'package.json'));

let found = false;
for (const filename of readdirSync(addonBaseDir)) {
  if (!/[.]node$/.test(filename))
    continue;

  found = true;

  mkdirSync(outDir, { recursive: true });

  const newFilename =
    `v${version}-m${moduleVer}-n${napiVer}-${platform}-${libc}-${arch}.node`;

  console.log(`${filename} => ${newFilename}`);

  const oldFullPath = join(addonBaseDir, filename);
  let newFullPath = join(outDir, newFilename);

  if (binaryType === 'application/gzip') {
    newFullPath = `${newFullPath}.gz`;
    const ws = createWriteStream(newFullPath);
    ws.on('close', () => {
      setBinaryPath(newFullPath);
      process.exit(0);
    });
    createReadStream(oldFullPath).pipe(createGzip({ level: 9 })).pipe(ws);
  } else {
    try {
      copyFileSync(oldFullPath, newFullPath);
    } catch (ex) {
      console.error(`Unable to copy .node file: ${ex.message}`);
      process.exit(1);
    }
    setBinaryPath(newFullPath);
  }

  break;
}

if (!found) {
  console.error('Did not find any Release .node files');
  process.exit(1);
}

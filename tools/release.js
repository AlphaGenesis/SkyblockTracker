// Builds a signed release and writes release/<installer> + release/latest.json to upload to a GitHub release.
// Usage: npm run release -- 1.0.1
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) { console.error('Usage: npm run release -- <version>   (e.g. 1.0.1)'); process.exit(1); }

const keyFile = path.join(os.homedir(), '.tauri', 'skyblock-tracker.key');
if (!fs.existsSync(keyFile)) { console.error('Signing key not found: ' + keyFile); process.exit(1); }

for (const f of ['src-tauri/tauri.conf.json', 'package.json']) {
  const p = path.join(root, f), j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.version = version;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}

const env = { ...process.env, TAURI_SIGNING_PRIVATE_KEY: fs.readFileSync(keyFile, 'utf8'), TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '' };
env.Path = (env.Path || env.PATH) + path.delimiter + path.join(os.homedir(), '.cargo', 'bin');
execSync('npx tauri build', { cwd: root, env, stdio: 'inherit' });

const nsis = path.join(root, 'src-tauri/target/release/bundle/nsis');
const built = `Skyblock Tracker_${version}_x64-setup.exe`;
const name = `SkyblockTracker_${version}_x64-setup.exe`; // no space: GitHub renames spaces in asset names, which would break the URL
const out = path.join(root, 'release');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
fs.copyFileSync(path.join(nsis, built), path.join(out, name));
fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify({
  version,
  pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': {
    signature: fs.readFileSync(path.join(nsis, built + '.sig'), 'utf8'),
    url: `https://github.com/AlphaGenesis/SkyblockTracker/releases/download/v${version}/${name}`,
  } },
}, null, 2));
console.log(`\nDone. Create a GitHub release with tag v${version} and upload both files from:\n  ${out}`);

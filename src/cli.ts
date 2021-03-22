const fs = require("fs");
const {decrypt} = require("./decrypt");
const util = require('util');
const read = util.promisify(require('read'));
const totp = require('totp-generator');

function readBackupContents(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  })
}

async function main() {
  if (!process.argv[2]) {
    console.log(`Usage: ${process.argv[1]} path-to-backup.json.aes`);
    return;
  }
  const buffer = await readBackupContents(process.argv[2]);
  console.log("Pass?");
  const password = await read({silent: true});
  const decrypted = await decrypt(password, buffer);
  const services = JSON.parse(decrypted);
  services
      .map((s, i) => `${i+1}. ${s.issuer} – ${s.label}`)
      .forEach(line => console.log(line));
  console.log("Pick a service using its number in the list:");
  const i = await read({silent: false});
  const entry = services[i-1];
  const otp = totp(entry.secret, {digits: entry.digits, period: entry.period});
  console.log(otp);
}

main();

import * as ElectronStore from "electron-store";
const fs = require("fs");

export class InvalidSecretsPathError extends Error {
  constructor() {
    super(`No secrets location specified`);
  }
}

export class SecretsFileProvider {
  private secrets: Buffer;
  constructor(private store: ElectronStore) {
  }

  hasValidSecretsPath(): boolean {
    const secretsPath = this.store.get("secrets-path");
    if (secretsPath == null) return false;
    return fs.existsSync(secretsPath);
  }

  setSecretsPath(path): void {
    this.store.set("secrets-path", path);
    this.secrets = null;
  }

  async loadSecrets() {
    const secretsPath = this.store.get("secrets-path");
    if (secretsPath == null) {
      throw new InvalidSecretsPathError();
    }
    this.secrets = await this.readFileContents(secretsPath);
  }

  private async readFileContents(filename): Promise<Buffer> {
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

  getBuffer() {
    return this.secrets;
  }
}

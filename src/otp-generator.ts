import {SecretsFileProvider} from "./secrets-file-provider";
import { decrypt } from "./decrypt";
import totp from "totp-generator";

export interface ServiceInformation {
  issuer: string;
  label: string;
  thumbnail: string,
}

export interface ServiceSecretInformation extends ServiceInformation {
  secret: string,
  digits: number,
  type: string,
  algorithm: string,
  period: number,
  tags: string[]
}

export interface Otp {
  otp: string;
  remainingMs: number;
}

export class OtpGenerator {
  private services: ServiceSecretInformation[] = null;

  constructor(private secretsFileProvider: SecretsFileProvider) {
  }

  async unlock(password: string): Promise<void> {
    this.services = JSON.parse(await decrypt(password, this.secretsFileProvider.getBuffer()));
  }

  lock(): void {
    this.services = [];
  }

  isUnlocked(): boolean {
    return this.services != null;
  }

  listServices(): ServiceInformation[] {
    return this.services.map(s => ({
      issuer: s.issuer,
      label: s.label,
      thumbnail: s.thumbnail
    }));
  }

  async generateOTP(issuer, label): Promise<Otp> {
    const service = this.services.find(s => s.issuer === issuer && s.label === label);
    if (service == null) {
      throw new Error("Service not found");
    }

    const otp = totp(service.secret, {
      digits: service.digits,
      algorithm: this.translateHashAlgorithm(service.algorithm),
      period: service.period
    });
    return {
      otp,
      remainingMs: this.expiresIn(service)
    };
  }

  private translateHashAlgorithm(andOtpFormat: string): string {
    if (andOtpFormat === "SHA1") {
      return "SHA-1";
    }
    return andOtpFormat;
  }

  private expiresIn(service: ServiceSecretInformation): number {
    const periodMs = (service.period ?? 30) * 1000;
    const epoch = Date.now();
    const elapsed = epoch % periodMs;
    const remaining = periodMs - elapsed;
    return remaining;
  }
}

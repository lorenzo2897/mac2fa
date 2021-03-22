import { app, App, clipboard, dialog, Menu, MenuItemConstructorOptions, Tray } from "electron";
import path from "path";
import { OtpGenerator, ServiceInformation } from "./otp-generator";
import { InvalidSecretsPathError, SecretsFileProvider } from "./secrets-file-provider";
import { PasswordDialog } from "./password-dialog";
import { canPromptTouchID, promptTouchID } from "node-mac-auth";

export class GUI {
  private tray: Tray;

  constructor(private readonly app: App,
              private readonly otpGenerator: OtpGenerator,
              private readonly secretsFileProvider: SecretsFileProvider) {
  }

  init() {
    this.tray = new Tray(path.join(__dirname, "../assets/tray-icon/tray.png"));
    this.tray.setToolTip("mac2FA");
    this.buildMenu();
  }

  buildMenu() {
    const items: MenuItemConstructorOptions[] = [];

    if (this.otpGenerator.isUnlocked()) {
      items.push(...this.otpGenerator.listServices().map(s => ({
        label: `${s.issuer} – ${s.label}`,
        click: () => this.authenticateAndCopyOtp(s)
      })));
    } else {
      items.push(
        { label: "2FA locked", enabled: false },
        { label: "Unlock...", click: () => this.unlock() }
      );
    }

    items.push({ type: "separator" });

    if (this.secretsFileProvider.hasValidSecretsPath()) {
      items.push({ label: "Forget secrets path", click: () => this.clearSecretsPath() });
    } else {
      items.push( { label: "Set secrets path...", click: () => this.setSecretsPath() });
    }

    items.push({ label: "Quit", type: "normal", click: () => this.quit() });

    const contextMenu = Menu.buildFromTemplate(items);
    this.tray.setContextMenu(contextMenu);
  }

  private async unlock() {
    try {
      if (!canPromptTouchID()) {
        throw new Error("No TouchID support found");
      }
      await this.secretsFileProvider.loadSecrets();
      const password = await new PasswordDialog().show();
      if (password == null) return;
      await this.otpGenerator.unlock(password);
      this.buildMenu();
    } catch (err) {
      if (err instanceof InvalidSecretsPathError) {
        if (!await this.setSecretsPath()) return;
      } else {
        dialog.showErrorBox("Unlock failed", err.message);
      }
    }
  }

  private async setSecretsPath(): Promise<boolean> {
    console.log("setting path");
    const path = await dialog.showOpenDialog({title: "Choose a secrets file", properties: ['openFile']});
    if (path.canceled) {
      return false;
    }
    this.secretsFileProvider.setSecretsPath(path.filePaths[0]);
    try {
      await this.secretsFileProvider.loadSecrets();
      this.otpGenerator.lock();
    } catch (err) {
      dialog.showErrorBox("Load failed", err.message);
    }
    this.buildMenu();
    return true;
  }

  private async clearSecretsPath() {
    this.secretsFileProvider.setSecretsPath(null);
    this.otpGenerator.lock();
    this.buildMenu();
  }

  private async quit() {
    app.quit();
  }

  private async authenticateAndCopyOtp(service: ServiceInformation) {
    try {
      await promptTouchID({reason: "generate a TOTP"});
    } catch (err) {
      dialog.showErrorBox("Touch ID authentication failed", err.message);
    }
    await this.copyOtp(service);
  }

  private async copyOtp(service: ServiceInformation) {
    try {
      const {otp, remainingMs} = await this.otpGenerator.generateOTP(service.issuer, service.label);
      clipboard.writeText(otp);
      if (remainingMs < 5000) {
        setTimeout(() => this.copyOtp(service), remainingMs + 100);
      }
    } catch (err) {
      dialog.showErrorBox("OTP generation failed", err.message);
    }
  }
}

import { app } from "electron";
import { GUI } from "./gui";
import { SecretsFileProvider } from "./secrets-file-provider";
import { OtpGenerator } from "./otp-generator";
import ElectronStore from "electron-store";

const secretsFileProvider = new SecretsFileProvider(new ElectronStore());
const otpGenerator = new OtpGenerator(secretsFileProvider);

let gui = new GUI(
    app,
    otpGenerator,
    secretsFileProvider
);

app.whenReady().then(async () => {
  gui.init();
})

app.on('window-all-closed', e => e.preventDefault() );

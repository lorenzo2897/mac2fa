import { BrowserWindow, ipcMain } from "electron";
import * as path from "path";

export class PasswordDialog {
  constructor() {
  }

  async show(): Promise<string> {
    const authPromptWin = new BrowserWindow({
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, "../assets/password-preload.js")
      },
      width: 360,
      height: 160,
      backgroundColor: "#ececec",
      closable: false,
      minimizable: false,
      resizable: false
    });
    await authPromptWin.loadFile(path.join(__dirname, "../assets/password.html"));

    return new Promise((resolve, reject) => {
      ipcMain.once("form-submission", (event, password) => {
        authPromptWin.setClosable(true);
        authPromptWin.close();
        resolve(password);
      });
    });
  }
}

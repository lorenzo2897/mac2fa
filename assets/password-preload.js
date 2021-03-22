const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    "ipc", {
      submit: (data) => {
        ipcRenderer.sendSync("form-submission", data);
      },
    }
);

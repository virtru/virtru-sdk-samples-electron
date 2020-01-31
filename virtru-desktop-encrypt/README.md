# Virtru Desktop Encrypt App

#### Written in nodejs using Electron

![Main Window](https://github.com/virtru/virtru-sdk-samples-electron/blob/master/virtru-desktop-encrypt/images/main-window-screenshot.png)

### Install
* Clone repo
* `npm install electron --save-dev`
* `npm install virtru-sdk`
* `npm install request`

### Run
* `npm start`

### Usage
This app has three main functions:
* Encrypt (with security controls)
* Decrypt
* Generate AppID

When first launched, the app will show an error indicating that you do not have a valid appid / email combination.  Open the Settings menu via the gear icon in the top right to either input your own enail address and appid manually, or enter your email address and click "Generate New AppID" to trigger a new email code loop.  If you use the loop, grab the code from your email and put it into the prompt.

You can also specify the directory where you'd like encrypted & decrypted files to be saved.

![Settings-1](https://github.com/virtru/virtru-sdk-samples-electron/blob/master/virtru-desktop-encrypt/images/user-settings-screenshot-1.png)
![Settings-2](https://github.com/virtru/virtru-sdk-samples-electron/blob/master/virtru-desktop-encrypt/images/user-settings-screenshot-2.png)

#### Encrypt
* Add authorized users, comma-separated (optional)
* Select access control policies (optional)
* Click "Select File(s) to Encrypt"
  * Multiple selections are supported
* File(s) will be encrypted and saved to the specified location (or to source directory if none specified)

#### Decrypt
* Click "Select File(s) to Decrypt"
  * Multiple selections are supported
* File(s) will be decrypted and saved to the specified location (or to source directory if none specified)

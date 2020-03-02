const { app, BrowserWindow } = require('electron');
const { ipcMain, dialog } = require('electron');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const Virtru = require('virtru-sdk');
const Store = require('./scripts/store.js');
var request = require('request');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let settingsPage;


const store = new Store({
  configName: 'user-settings',
  defaults: {
    virtru_creds: {
      email_address: 'example@example.com',
      app_id: '00000000-0000-0000-0000-000000000000'
    },
    windowBounds: {
      width: 400,
      height: 700
    },
    save_location: {
      path: 'Unspecified. Files saved to source directory.'
    }
  }
});


function createWindow () {
  let { width, height } = store.get('windowBounds');

  // Create the browser window.
  win = new BrowserWindow({
    width: 400,
    height: 700,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('./pages/index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()


  win.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = win.getBounds();
    // Now that we have them, save them using the `set` method.
    store.set('windowBounds', { width, height });
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

function createSettings() {
  settingsPage = new BrowserWindow({
    parent: win,
    width: 500,
    height: 310,
    webPreferences: {
      nodeIntegration: true
    }
  })

  settingsPage.loadFile('./pages/settings.html');

  settingsPage.on('closed', () => {
    settingsPage = null;
  })
}

let client;
function getCreds() {
  const { email, appId } = store.get('virtru_creds');
  return [email, appId];
}

var email = getCreds()[0];
var appId = getCreds()[1];

function refreshCreds() {
  var [email, appId] = getCreds();
  if (email && email !== '' && appId && appId !== '') {
    client = new Virtru.Client({email, appId});
  }
}

refreshCreds();




function checkCreds(email, appId) {
  var options = {
    url: 'https://api.virtru.com/accounts/api/org',
    headers: {
      'Origin': 'https://secure.virtru.com',
      'Authorization': `Virtru [["${appId}","${email}"]]`,
      'Content-Type': 'application/json',
      'X-Virtru-Client': `${email}-desktop-encrypt:1.0.0`
    }
  };
  request(options, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      console.log(`Valid appId / email combo.`);
    } else {
      console.log(`Invalid appId / email combo`);
      console.log(JSON.parse(body));
      dialog.showErrorBox('New Credentials Required', 'You have not provided a valid email/appId bundle, or your existing credentials have expired. Open the Settings page to add new credentials.');
      win.webContents.send('invalid-appid');
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== 'darwin') {
  app.quit()
});


app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }

})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('main-page-loaded', (event) => {
  checkCreds(email, appId);
})

ipcMain.on('settings-clicked', (event) => {
  if (settingsPage == null) {
    createSettings();
  }
})


ipcMain.on('settings-page-loaded', (event) => {
  event.sender.send('creds-from-file', [store.get('virtru_creds'), store.get('save_location')]);
})



ipcMain.on('save-settings', (event, args) => {
  email = args[0];
  appId = args[1];
  var storageLoc = args[2];
  store.set('virtru_creds', { email, appId });
  store.set('save_location', storageLoc);
  refreshCreds();
  settingsPage.close();
})

ipcMain.on('save-directory-clicked', (event) => {
  var directory = dialog.showOpenDialogSync(settingsPage, {
    properties: ['openDirectory']
  });
  console.log(directory);
  if (directory) {
    var path = directory[0];
    event.sender.send('save-directory-selected', path);
  }

})


var disableResharing = false;
var watermarking = false;
var expiration = false;
var expirationTime = '';
var expirationDate = new Date();
var authorizedUsers = '';
var usersArray = [];

ipcMain.on('disable-reshare-on', (event) => {
  disableResharing = true;
  console.log('Disable Resharing: ' + disableResharing);
})

ipcMain.on('disable-reshare-off', (event) => {
  disableResharing = false;
  console.log('Disable Resharing: ' + disableResharing);
})

ipcMain.on('watermark-on', (event) => {
  watermarking = true;
  console.log('Watermarking: ' + watermarking);
})

ipcMain.on('watermark-off', (event) => {
  watermarking = false;
  console.log('Watermarking: ' + watermarking);
})

ipcMain.on('expire-on', (event) => {
  expiration = true;
  console.log('Expiration: ' + expiration);
})

ipcMain.on('expire-off', (event) => {
  expiration = false;
  console.log('Expiration: ' + expiration);
})

ipcMain.on('exp-date', (event, args) => {
  expirationDate = new Date(args);
  var isoDate = expirationDate.toISOString();
  expirationDate = isoDate;
  expirationTime = expirationDate - Date.now();
  console.log('expirationDate: ' + expirationDate);
  console.log(`Expires in ${expirationTime} ms.`);
})

ipcMain.on('authorized-users', (event, args) => {
  if (authorizedUsers == '') {
    usersArray.push(email);
  }
  else {
  authorizedUsers = args;
  console.log('Authorized Users: ' + authorizedUsers);
  usersArray = authorizedUsers.split(", ");
  }
  console.log('Line 240: ' + usersArray);
})

ipcMain.on('reset-all', () => {
  disableResharing = false;
  watermarking = false;
  expiration = false;
  expirationTime = '';
  expirationDate = new Date();
  authorizedUsers = '';
  usersArray = [];
})

function buildPolicy() {
  var policy = new Virtru.PolicyBuilder();

  if (disableResharing == true) {
    policy.disableReshare();
  }

  if (watermarking == true) {
    policy.enableWatermarking();
  }

  if (expiration == true) {
    policy.enableExpirationDeadline(expirationDate);
  }

  return policy.build();
}


async function encrypt(filePath, fileName, policy, authUsers) {
  const encryptParams = new Virtru.EncryptParamsBuilder()
    .withFileSource(filePath)
    .withDisplayFilename(fileName)
    .withPolicy(policy)
    .withUsersWithAccess(authUsers)
    .build();
  ct = await client.encrypt(encryptParams);

  var i = 1;
  var array = fileName.split('.');
  var outFileName = `${array[0]}.${array[1]}`;

  if (store.get('save_location') !== '[object Object]') {
    while (fs.existsSync(`${store.get('save_location')}/${outFileName}.tdf3.html`)) {
      outFileName = `${array[0]} (${i}).${array[1]}`;
      i++;
    }
    await ct.toFile(`${store.get('save_location')}/${outFileName}.tdf3.html`);
  } else {
    while (fs.existsSync(`${filePath.replace(fileName, outFileName)}.tdf3.html`)) {
      outFileName = `${array[0]} (${i}).${array[1]}`;
      i++;
    }
    await ct.toFile(`${filePath.replace(fileName, outFileName)}.tdf3.html`);
  }

}

async function decrypt(filePath, fileName) {
  const decryptParams = new Virtru.DecryptParamsBuilder()
    .withFileSource(filePath)
    .build();
  const stream = await client.decrypt(decryptParams);

  var i=1;
  var array = fileName.split('.');
  var outFileName = `${array[0]}.${array[1]}`;
  console.log('outFileName: ' + outFileName)

  //stream.toFile(`${store.get('save_location')}/${outFileName}`);
  if (store.get('save_location') !== '[object Object]') {
    while (fs.existsSync(`${store.get('save_location')}/${outFileName}`)) {
      outfileName = `${array[0]} (${i}).${array[1]}`;
      i++;
    }
    stream.toFile(`${store.get('save_location')}/${outFileName}.tdf3.html`);
  } else {
    while (fs.existsSync(`${filePath.replace(fileName, outFileName)}.tdf3.html`)) {
      outFileName = `${array[0]} (${i}).${array[1]}`;
      i++;
    }
    stream.toFile(`${filePath.replace(fileName, outFileName)}.tdf3.html`);
  }
}


ipcMain.on('open-file-dialog', async (event) => {

  var paths = dialog.showOpenDialogSync(win, {
    properties: ['openFile', 'multiSelections']
  });
  var files = [];
  for (i in paths) {
    var array = (paths[i]).split("/");
    var fileName = array[(array.length - 1)];
    files.push(fileName);
    console.log('File selected: ' + fileName);
  }

  var policy = buildPolicy();
  event.sender.send('selected-directory', files);
  console.log(`Files: ${files}`);

  var filesSuccess = [];
  for (i in paths) {
    var array = (paths[i]).split("/");
    var fileName = array[(array.length - 1)];

    encrypt(paths[i], fileName, policy, usersArray);
    filesSuccess.push(fileName);
    console.log(`${fileName} - Success.`);
    event.sender.send('successful-encrypt', filesSuccess);
  }
})

ipcMain.on('open-decrypt-dialog', async (event) => {
  var paths = dialog.showOpenDialogSync(win, {
    properties: ['openFile', 'multiSelections']
  });
  var files = [];
  for (i in paths) {
    var array = (paths[i]).split("/");
    var fileName = array[(array.length - 1)];
    files.push(fileName);
    console.log('File selected: ' + fileName);
  }
  event.sender.send('selected-decrypt-files', files);
  console.log(`Files: ${files}`);

  var filesSuccess = [];
  for (i in paths) {
    var array = (paths[i]).split("/");
    var fileName = array[(array.length - 1)];

    decrypt(paths[i], fileName);
    filesSuccess.push(fileName);
    console.log(`${fileName} - Success.`);
    event.sender.send('successful-decrypt', filesSuccess);
  }
})

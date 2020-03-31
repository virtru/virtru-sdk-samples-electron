const {app, BrowserWindow, ipcMain, Tray, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const Virtru = require('virtru-sdk');
const Store = require('./scripts/store.js');
var request = require('request');
const chokidar = require('chokidar');
const { google } = require('googleapis');
const readline = require('readline');

const folderId = JSON.parse(fs.readFileSync('./.google/folderId.json'))['folderId'];
let tray = undefined
let window = undefined

// Create user settings store.
const store = new Store({
  configName: 'user-settings',
  defaults: {
    virtru_creds: {
      email_address: 'example@example.com',
      app_id: '00000000-0000-0000-0000-000000000000'
    },
    save_location: {
      path: 'Unspecified.'
    }
  }
});

// Don't show the app in the doc
//app.dock.hide()

app.on('ready', () => {
  createTray()
  createWindow()
  checkCreds(email, appId)
})

// Create an icon in the tray.
const createTray = () => {
  tray = new Tray('./images/virtru-mark-black.png');
  tray.on('click', function (event) {
    toggleWindow()
  });
}

// Determine where the tray icon is located so the
// window can be positioned directly below it.
const getWindowPosition = () => {
  const windowBounds = window.getBounds();
  const trayBounds = tray.getBounds();

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));

  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  return {x: x, y: y};
}

// Create the window.
const createWindow = () => {
  window = new BrowserWindow({
    width: 320,
    height: 340,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: false,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true
    }
  })
  window.loadFile(`./pages/settings.html`)

  // Hide the window when it loses focus
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide()
    }
  })
}

const toggleWindow = () => {
  window.isVisible() ? window.hide() : showWindow();
}

const showWindow = () => {
  const position = getWindowPosition();
  window.setPosition(position.x, position.y, false);
  window.show();
}

ipcMain.on('show-window', () => {
  showWindow()
})






// Create Virtru client and get any existing credentials
// from user settings.
let client;
function getCreds() {
  var { email, appId } = store.get('virtru_creds');
  return [email, appId];
}
// Assign credentials to respective variables.
var email = getCreds()[0];
var appId = getCreds()[1];


function refreshCreds() {
  var [email, appId] = getCreds();
  if (email && email !== '' && appId && appId !== '') {
    client = new Virtru.Client({email, appId});
  }
}

refreshCreds();





// Check if the user has a valide email / appId combo.
function checkCreds(email, appId) {
  var options = {
    url: 'https://api.virtru.com/accounts/api/org',
    headers: {
      'Origin': 'https://secure.virtru.com',
      'Authorization': `Virtru [["${appId}","${email}"]]`,
      'Content-Type': 'application/json'
    }
  };
  request(options, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      console.log(`Valid appId / email combo.`);
    } else {
      console.log(`Invalid appId / email combo`);
      console.log(JSON.parse(body));
      dialog.showErrorBox('New Credentials Required', 'You have not provided a valid email/appId bundle, or your existing credentials have expired. Open the Settings page to add new credentials.');
      window.webContents.send('invalid-appid');
    }
  });
}

// Retreive user settings to display in settings page.
ipcMain.on('settings-page-loaded', (event) => {
  event.sender.send('creds-from-file', [store.get('virtru_creds'), store.get('save_location')]);
})

// Save user settings
ipcMain.on('save-settings', (event, args) => {
  email = args[0];
  appId = args[1];
  var storageLoc = args[2];
  store.set('virtru_creds', { email, appId });
  store.set('save_location', storageLoc);
  refreshCreds();
  toggleWindow();
})

// Save user's source folder to user settings.
ipcMain.on('save-directory-clicked', (event) => {
  var directory = dialog.showOpenDialogSync(window, {
    properties: ['openDirectory']
  });
  var path = directory[0];
  event.sender.send('save-directory-selected', path);
})

// Virtru encrypt function.
async function encrypt(path, fileName) {
  const encryptParams = new Virtru.EncryptParamsBuilder()
    .withFileSource(path)
    .withDisplayFilename(fileName)
    .build();
  ct = await client.encrypt(encryptParams);
  var ctString = await ct.toString();
  return ctString;
}

// Upload to Google drive
async function upload(drive, path, fileName, folderId) {
  var fileMetadata = {
    'name': `${fileName}.tdf3.html`,
    parents: [folderId]
  };
  var media = {
    mimeType: 'text/html',
    body: await encrypt(path, fileName)
  };
  drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  }, function (err, file) {
    if (err) {
      console.error(err);
      console.log(`${fileName} - Error.`);
    } else {
      console.log(`${fileName} - Success.`);
    }
  });
}

// Watch the source folder for changes
async function watchFiles(auth) {
  if (store.get('save_location') !== '') {
    console.log(`Watching ${store.get('save_location')}`);
    var email = getCreds()[0];
    var appId = getCreds()[1];
    console.log(email, appId);
    client = new Virtru.Client({email, appId});
    const drive = google.drive({version: 'v3', auth});
    const watcher = chokidar.watch(store.get('save_location'), {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('add', async path => {
      console.log(path);
      var fileName = path.split("/")[(path.split("/")).length-1];
      upload(drive, path, fileName, folderId);
    });
  }
}


// GOOGLE STUFF

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './.google/token.json';

// Load client secrets from a local file.
fs.readFile('./.google/credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), watchFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

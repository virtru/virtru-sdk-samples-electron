const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');


var emailInput = document.getElementById('email-address-settings');
var appIdInput = document.getElementById('appid-settings');
var saveExitBtn = document.getElementById('save-close');
var selectSaveDirBtn = document.getElementById('select-save-location');



document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('settings-page-loaded');
})


selectSaveDirBtn.addEventListener('click', (event) => {
  ipcRenderer.send('save-directory-clicked');
})


ipcRenderer.on('save-directory-selected', (event, arg) => {
  var location = arg;
  console.log(location);
  document.getElementById('save-location').value = location;
})


ipcRenderer.on('new-creds', (event, args) => {
  emailInput.value = args[0];
  appIdInput.value = args[1];
})

ipcRenderer.on('creds-from-file', (event, args) => {
  if (args[0]['email'] == null) {
    emailInput.value = '';
  } else {
    emailInput.value = args[0]['email'];
  }

  if (args[0]['appId'] == null) {
    appIdInput.value = '';
  } else {
    appIdInput.value = args[0]['appId'];
  }

  if (args[1].toString() == '[object Object]') {
    document.getElementById('save-location').value = '';
  } else {
    document.getElementById('save-location').value = args[1];
  }
})

saveExitBtn.addEventListener('click', (event) => {
  ipcRenderer.send('save-settings', [
    emailInput.value,
    appIdInput.value,
    document.getElementById('save-location').value
  ]);
  console.log(emailInput.value, appIdInput.value);
})

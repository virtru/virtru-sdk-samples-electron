const {ipcRenderer} = require('electron');
const path = require('path');
const fs = require('fs');


var emailInput = document.getElementById('email-address-settings');
var appIdInput = document.getElementById('appid-settings');
var codeInputArea = document.getElementById('code-input-block');
var codeInputField = document.getElementById('verification-code-input');
var codeInputPlaceholder = document.getElementById('code-input-placeholder');

var codeInputTooltip = document.getElementById('code-input-tooltip-text');

var reqAppIdBtn = document.getElementById('appid-gen');
var submitCodeBtn = document.getElementById('code-submit');
var saveExitBtn = document.getElementById('save-close');
var selectSaveDirBtn = document.getElementById('select-save-location');



document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('settings-page-loaded');
})

reqAppIdBtn.addEventListener('click', (event) => {
  codeInputArea.style.display = 'block';
  reqAppIdBtn.style.display = 'none';
  submitCodeBtn.style.display = 'block';
  codeInputPlaceholder.style.display = 'none';
  codeInputTooltip.innerText = `A verification code has just been sent to ${emailInput.value}. Enter that code here.`
  ipcRenderer.send('app-id-request', [
    emailInput.value
  ]);
})

submitCodeBtn.addEventListener('click', (event) => {
  submitCodeBtn.style.display = 'none';
  reqAppIdBtn.style.display = 'block';
  codeInputArea.style.display = 'none';
  codeInputPlaceholder.style.display = 'block';
  ipcRenderer.send('code-submit', [
    emailInput.value,
    codeInputField.value
  ]);
})

selectSaveDirBtn.addEventListener('click', (event) => {
  ipcRenderer.send('save-directory-clicked');
})


ipcRenderer.on('save-directory-selected', (event, arg) => {
  var location = arg;
  console.log(location);
  document.getElementById('save-location').value = location;
})

ipcRenderer.on('max-codes-error', (event) => {
  submitCodeBtn.style.display = 'none';
  reqAppIdBtn.style.display = 'block';
  codeInputArea.style.display = 'none';
  codeInputPlaceholder.style.display = 'block';
})

ipcRenderer.on('code-submit-error', (event) => {
  submitCodeBtn.style.display = 'none';
  reqAppIdBtn.style.display = 'block';
  codeInputArea.style.display = 'none';
  codeInputPlaceholder.style.display = 'block';
})

ipcRenderer.on('new-creds', (event, args) => {
  emailInput.value = args[0];
  appIdInput.value = args[1];
})

ipcRenderer.on('creds-from-file', (event, args) => {
  emailInput.value = args[0]['email'];
  appIdInput.value = args[0]['appId'];
  document.getElementById('save-location').value = args[1];

  //let email, appId = args;
  //emailInput.innerText = email;
  //appIdInput.value = appId;
})

saveExitBtn.addEventListener('click', (event) => {
  ipcRenderer.send('save-settings', [
    emailInput.value,
    appIdInput.value,
    document.getElementById('save-location').value
  ]);
  console.log(emailInput.value, appIdInput.value);
})

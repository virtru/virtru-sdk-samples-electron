const {ipcRenderer} = require('electron')


Date.prototype.toDateInputValue = (function() {

    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset() + 1440);
    return local.toJSON().slice(0,10);
});

const settingsBtn = document.getElementById('settings-toggle');
settingsBtn.addEventListener('click', (event) => {
  ipcRenderer.send('settings-clicked');
  settingsBtn.style.background = '#174EB6';
})

// Open the file dialog.  Trigger error state if no expiration date selected.
// Pass authorized users to Main process.
const selectDirBtn = document.getElementById('select-files');
selectDirBtn.addEventListener('click', (event) => {
  if (document.getElementById('expiration-date').value == '' && document.getElementById('expiration-toggle').checked) {
    document.getElementById('expiration-date-picker').style.background = '#ff0000';
  } else {
    document.getElementById('expiration-date-picker').style.background = '#174EB6';
    var authorizedUsers = document.getElementById('auth-users').value;
    ipcRenderer.send('authorized-users', authorizedUsers);
    ipcRenderer.send('open-file-dialog');
  }
})

const selectDecryptBtn = document.getElementById('select-files-decrypt');
selectDecryptBtn.addEventListener('click', (event) => {
  ipcRenderer.send('open-decrypt-dialog');
})

// Send Disable Reshare information to Main process when button toggled.
const disableReshareBtn = document.getElementById('disable-reshare-toggle');
disableReshareBtn.addEventListener('click', (event) => {
  console.log('clicked - disable reshare');
  if (disableReshareBtn.checked) {
    ipcRenderer.send('disable-reshare-on');
  } else {
    ipcRenderer.send('disable-reshare-off');
  }
})

// Send Watermark information to Main process when button toggled.
const watermarkBtn = document.getElementById('watermark-toggle');
watermarkBtn.addEventListener('click', (event) => {
  console.log('clicked - watermark');
  if (watermarkBtn.checked) {
    ipcRenderer.send('watermark-on');
  } else {
    ipcRenderer.send('watermark-off');
  }
})

// Send Expiration information to Main process when button toggled.
// Show calendar for user to pick date.
const expireBtn = document.getElementById('expiration-toggle');
const expireCalendar = document.getElementById('expiration-date-picker');
expireBtn.addEventListener('click', (event) => {
  console.log('clicked - expire');
  document.getElementById('expiration-date-picker').style.background = '#174EB6';
  if (expireBtn.checked) {
    expireCalendar.style.display = "block";
    ipcRenderer.send('expire-on');
  } else {
    expireCalendar.style.display = "none";
    document.getElementById('expiration-date').value = '';
    ipcRenderer.send('expire-off');
  }
})

// Collect user's expiration date input and send to Main.
const expirationDateField = document.getElementById('expiration-date');
expirationDateField.addEventListener("change", (event) => {
  var input = expirationDateField.value;
  var dateEntered = new Date(input);
  dateEntered.setMinutes(dateEntered.getMinutes() - dateEntered.getTimezoneOffset()+600);
  dateEntered.toJSON().slice(0,10);
  console.log(input);
  console.log(dateEntered);
  ipcRenderer.send('exp-date', dateEntered);
})


document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('main-page-loaded');
})

// Reset function.
function resetAll() {
  document.getElementById('auth-users').value = '';
  document.getElementById('expiration-toggle').checked = false;
  document.getElementById('watermark-toggle').checked = false;
  document.getElementById('disable-reshare-toggle').checked = false;
  document.getElementById('expiration-date').value = '';
  document.getElementById('expiration-date-picker').style.background = '#174EB6';
  document.getElementById('expiration-date-picker').style.display = 'none';
  document.getElementById('select-directory').innerHTML = '';
  ipcRenderer.send('reset-all');
}

// Reset all fields when reset clicked.
const resetBtn = document.getElementById('reset-settings');
resetBtn.addEventListener('click', (event) => {
  resetAll();
})

ipcRenderer.on('invalid-appid', (event) => {
  settingsBtn.style.background = '#ff0000'
})

// Receive response from Main; list selected files.
ipcRenderer.on('selected-directory', (event, fileName) => {
  console.log(fileName);
  if (fileName.length > 1) {
    document.getElementById('select-directory').innerHTML = `<strong>Selected files:</strong><br><br> ${fileName.join('<br>')}`;
  }
})

// Receive response from Main; list encrypted files.
ipcRenderer.on('successful-encrypt', (event, fileName) => {
  document.getElementById('select-directory').innerHTML = `<strong>Encrypted:</strong><br><br> ${fileName.join('.tdf3.html<br>')}`;
  setTimeout(function () {
        resetAll();
        }
    , 7000);
})

// Receive response from Main; list selected files.
ipcRenderer.on('selected-decrypt-files', (event, fileName) => {
  console.log(fileName);
  if (fileName.length > 1) {
    document.getElementById('select-decryptions').innerHTML = `<strong>Selected files:</strong><br><br> ${fileName.join('<br>')}`;
  }
})

// Receive response from Main; list encrypted files.
ipcRenderer.on('successful-decrypt', (event, fileName) => {
  document.getElementById('select-decryptions').innerHTML = `<strong>Decrypted:</strong><br><br> ${fileName.join('<br>')}`;
  setTimeout(function () {
    document.getElementById('select-decryptions').innerHTML = ``;
        }
    , 7000);
})

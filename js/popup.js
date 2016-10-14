window.onload = function() {
  var START = "启动";
  var STOP = "停止";
  
  var startButton = document.getElementById("start");
  var saveconfButton = document.getElementById("saveconf");
  var showlogsButton = document.getElementById("showlogs");
  var clearlogsButton = document.getElementById("clearlogs");
  var nervetakeSelect = document.getElementById("nervetake");
  var crimeSelect = document.getElementById("crime");

  if (!chrome.extension.getBackgroundPage().helper.isRunning()) {
    startButton.innerHTML = START;
  } else {
    startButton.innerHTML = STOP;
  }

  startButton.onclick = function() {
    if (startButton.innerHTML == START) {
      startButton.innerHTML = STOP;
      start();
    } else {
      startButton.innerHTML = START;
      stop();
    }
  }

  saveconfButton.onclick = function() {
    saveconf();
  }

  showlogsButton.onclick = function() {
    showlogs();
  }

  clearlogsButton.onclick = function() {
    clearlogs();
  }

  nervetakeSelect.onchange = function() {
    var crimes = data.crimes;
    var nerve = this.value;

    crimeSelect.options.length = 0;
    createOptions(crimeSelect, getCrimes(nerve));
    crimeSelect.onchange();
  }

  crimeSelect.onchange = function() {
    document.getElementById("crimeName").innerHTML = this.value;
  }

  createCrimeOptions(nervetakeSelect, crimeSelect);
  loadconf();
}

function createCrimeOptions(nervetakeSelect, crimeSelect) {
  var crimes = data.crimes;
  var nervetakes = [];

  for (key in crimes) {
    nervetakes.push(key);
  }
  createOptions(nervetakeSelect, nervetakes);
  createOptions(crimeSelect, getCrimes(nervetakes[0]));
}

function createOptions(node, values) {
  for (key in values) {
    var option = document.createElement("option");

    if (values instanceof Array) {
      option.text = values[key];
    } else {
      option.text = key;
    }
    
    option.value = values[key];
    node.add(option);
  }
}

function getCrimes(nerve) {
  var dcrimes = data.crimes[nerve];
  var crimes = {};

  for (index in dcrimes) {
    var values = dcrimes[index++];
    crimes[index] = values;
  }
  return crimes;
}

function loadconf() {
  var confForm = document.forms.conf;
  var elements = confForm.elements;
  var length = elements["length"];

  var i;
  for (i = 0; i < length; i++) {
    var element = elements[i];
    var name = element.name;
    var type = element.type;
    var value = localStorage[name];

    if (value) {
      if (type == "checkbox") {
        element.checked = (value == "true");
      } else if (type == "radio") {
        if (element.value == value) {
          element.checked = true;
        }
      } else {
        element.value = value;
        if (element.onchange) {
          element.onchange();
        }
      }
    }
  }
}

function start() {
  saveconf();
  chrome.extension.getBackgroundPage().helper.start();
}

function stop() {
  chrome.extension.getBackgroundPage().helper.stop();
}

function saveconf() {
  var confForm = document.forms.conf;
  var elements = confForm.elements;
  var length = elements["length"];

  var i;
  for (i = 0; i < length; i++) {
    var element = elements[i];
    var name = element.name;
    var type = element.type;

    if (name) {
      if (type == "checkbox") {
        localStorage[name] = element.checked;
      } else if (type == "radio") {
        if (element.checked) {
          localStorage[name] = element.value;
        }
      } else {
        localStorage[name] = element.value;
      }
    }
  }
}

function showlogs() {
  chrome.extension.getBackgroundPage().helper.showlogs();
}

function clearlogs() {
  chrome.extension.getBackgroundPage().helper.clearlogs();
}
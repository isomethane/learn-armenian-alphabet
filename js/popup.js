addEventListener("DOMContentLoaded", pageSetup);

function pageSetup() {
  loadMap("alphabet-options", (optionsMap) => { applyOptions(optionsMap); });

  setupCheckboxes();
  document.getElementById("save-button").addEventListener("click", onSaveButtonClick);
  document.getElementById("transliterate-button").addEventListener("click", onTransliterateButtonClick);
}

function getSubstitutionOptions() {
  let optionMap = new Map([["f", "first"], ["nf", "notFirst"]]);
  let substitutions = {
    first: new Map(),
    notFirst: new Map()
  };

  function addPairOption(hy, ru, option) {
    let map = substitutions[optionMap.get(option)];
    if (!map.has(ru)) {
      map.set(ru, []);
    }
    map.get(ru).push(hy);
  }

  function addLetterPair(hy, ru, options) {
    if (ru.length === 0) {
      return;
    }
    for (let option of options) {
      addPairOption(hy, ru, option);
    }
  }

  Array.from(document.getElementsByClassName("letter-checkbox"))
      .forEach((element) => {
        if (element.checked) {
          for (let letterCase of ["upper", "lower"]) {
            for (let ru of document.getElementsByClassName(`${element.id}-${letterCase}-ru`)) {
              addLetterPair(
                  document.getElementById(`${element.id}-${letterCase}-hy`).innerText,
                  ru.innerText,
                  ru.getAttribute("data-options").split(",")
              );
            }
          }
        }
      });
  return substitutions;
}


// Button click handlers

function onSaveButtonClick() {
  saveMap("alphabet-options", collectOptions(), () => {
    onSuccessfulAction("save-button");
  });
}

function onTransliterateButtonClick() {
  let substitutions = getSubstitutionOptions();
  for (let option in substitutions) {
    substitutions[option] = Object.fromEntries(substitutions[option]);
  }
  const params = {
    active: true,
    currentWindow: true
  }
  chrome.tabs.query(params, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, substitutions, undefined, (response) => {
      if (response === "success") {
        onSuccessfulAction("transliterate-button");
      }
    });
  });
}

function onSuccessfulAction(id) {
  let element = document.getElementById(id);
  element.classList.add("action-success");
  setTimeout(() => {
    element.classList.remove("action-success");
  }, 500);
}


// Checkbox click handlers

function setupCheckboxes() {
  let checkAll = document.getElementById("all-letters");
  checkAll.addEventListener("click", (event) => {
    setCheckedAll(event.currentTarget.checked);
  });

  for (let checkbox of document.getElementsByClassName("letter-checkbox")) {
    checkbox.addEventListener("click", (event) => {
      if (!event.currentTarget.checked) {
        checkAll.checked = false;
      }
    });
  }
}

function setCheckedAll(isChecked) {
  for (let checkbox of document.getElementsByClassName("letter-checkbox")) {
    checkbox.checked = isChecked;
  }
}


// Options persistence utility functions

function collectOptions() {
  const options = Array.from(document.getElementsByClassName("letter-checkbox"))
      .map((element) => {
        return [element.id, element.checked];
      });
  return new Map(options);
}

function applyOptions(optionsMap) {
  optionsMap.forEach((value, key) => {
    document.getElementById(key).checked = value;
  });
}


// Storage utility functions

function saveMap(key, map, callback) {
  const object = {};
  object[key] = JSON.stringify(Object.fromEntries(map));
  chrome.storage.sync.set(object, callback);
}

function loadMap(key, callback) {
  chrome.storage.sync.get([key], (result) => {
    if (result[key] === undefined) {
      callback(new Map());
      return;
    }
    const map = new Map(Object.entries(JSON.parse(result[key])));
    callback(map);
  });
}

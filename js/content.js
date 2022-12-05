chrome.runtime.onMessage.addListener(transliteratePageMessageHandler);

function transliteratePageMessageHandler(message, sender, sendResponse) {
  let substitutions = {
    first: new Map(Object.entries(message.first)),
    notFirst: new Map(Object.entries(message.notFirst)),
  };

  let matchCounts = {};
  for (let option in substitutions) {
    matchCounts[option] = new Map(Array.from(substitutions[option].keys()).map((key) => { return [key, 0] }));
  }

  let regexOptions = {
    sequence: {},
    letter: {},
  }
  for (let option in substitutions) {
    let lookAhead = option === "first" ? "(?<=[\\s,.:;\"']|^)" : "(?<![\\s,.:;\"']|^)";
    let sequencePattern = Array.from(substitutions[option].keys())
        .filter((key) => { return key.length > 1 })
        .join("|");
    let letterPattern = Array.from(substitutions[option].keys())
        .filter((key) => { return key.length === 1 })
        .join("|");

    if (sequencePattern.length > 0) {
      regexOptions.sequence[option] = new RegExp(`${lookAhead}(?:${sequencePattern})`, "g")
    }
    if (letterPattern.length > 0) {
      regexOptions.letter[option] = new RegExp(`${lookAhead}(?:${letterPattern})`, "g")
    }
  }

  function getMatchReplacement(ru, option) {
    let map = substitutions[option];
    if (!map.has(ru)) {
      return ru;
    }
    let count = matchCounts[option].get(ru);
    matchCounts[option].set(ru, count + 1);
    let replacements = map.get(ru);
    return replacements[count % replacements.length];
  }

  function processText(text) {
    for (let lenOption of ["sequence", "letter"]) {
      for (let positionOption in regexOptions[lenOption]) {
        text = text.replace(regexOptions[lenOption][positionOption], (match) => {
          return getMatchReplacement(match, positionOption);
        });
      }
    }
    return text;
  }

  for (let bodyElement of document.getElementsByTagName("body")) {
    replaceText(bodyElement, processText);
  }

  sendResponse("success");
  return true;
}

function replaceText(node, callback) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    for (let childNode of node.childNodes) {
      replaceText(childNode, callback);
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    node.textContent = callback(node.textContent);
  }
}

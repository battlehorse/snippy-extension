var snippage = {
 title: '',
 snippets: []
};

var stored_snippage = localStorage.getItem('snippage');
if (stored_snippage) {
  snippage = $.evalJSON(stored_snippage);
  updateBadgeText();
}

var dump_tab_id;
var cur_tab_id;
var cur_tab_url;
chrome.tabs.getSelected(null, function(tab) {
  cur_tab_url = tab.url;
  cur_tab_id = tab.id;
});

var activation = {};
var readiness = {};

function toggle() {
  chrome.tabs.getSelected(null, function(tab) {
    if (activation[tab.id]) {
      activation[tab.id] = false;
      chrome.tabs.sendRequest(tab.id, {'activate': false}, function(response) {});
    } else {
      activation[tab.id] = true;
      chrome.tabs.sendRequest(tab.id, {'activate': true}, function(response) {});
    }
  });
}

function toggleOff() {
  chrome.tabs.getSelected(null, function(tab) {
    if (activation[tab.id]) {
      activation[tab.id] = false;
      chrome.tabs.sendRequest(tab.id, {'activate': false}, function(response) {});
    }
  });
}

function showDump() {
  if (dump_tab_id) {
    chrome.tabs.update(dump_tab_id, { selected: true });
  } else {
    chrome.tabs.create({"url": "dump.html"}, function(tab) {
      tab.title = "Your snippets";
      dump_tab_id = tab.id;
    });
  }
}

function getSnipPage() {
  return snippage;
}

function updateLocalStorage() {
  localStorage.setItem('snippage', $.toJSON(snippage));
}

function clearCopy() {
  snippage.title = '';
  snippage.snippets = [];
  localStorage.removeItem('snippage');
  updateBadgeText();
  if (dump_tab_id) {
    chrome.tabs.remove(dump_tab_id);
  }
}

function about() {
  chrome.tabs.create({"url": "about.html"});
}

function bug() {
  chrome.tabs.create({"url": "bug.html"});
}

function updateBadgeText() {
  if (snippage.snippets.length == 0) {
    chrome.browserAction.setBadgeText({'text': ''});
  } else {
    chrome.browserAction.setBadgeText({'text': '' + snippage.snippets.length});
  }
}

function CurrentTabReadiness() {
  if (!readiness[cur_tab_id]) {
    return "unknown";
  } else {
    return readiness[cur_tab_id];
  }
}

function CurrentTabUrl() {
  return cur_tab_url;
}

chrome.tabs.onRemoved.addListener(function(tab_id) {
  if (dump_tab_id == tab_id) {
    dump_tab_id = null;
  }
});

chrome.tabs.onSelectionChanged.addListener(function(tab_id) {
  cur_tab_id = tab_id;
  if (dump_tab_id == tab_id) {
    chrome.tabs.sendRequest(tab_id, {'reload': true}, function(response){});
  }
  chrome.tabs.get(tab_id, function(tab) {
    cur_tab_url = tab.url;
  });
});

chrome.tabs.onUpdated.addListener(function(tab_id, change_info) {
  if (change_info.status == "loading") {
    console.log("Readiness of " + tab_id + " is 'loading'");
    readiness[tab_id] = "loading";
  } else if (change_info.status == "complete") {
    console.log("Readiness of " + tab_id + " is 'complete'");
    readiness[tab_id] = "ready";
  }
  chrome.tabs.get(tab_id, function(tab) {
    cur_tab_url = tab.url;
  });
});

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if (request.ready) {
      console.log("Readiness of " + sender.tab.id + " is 'ready'");
      readiness[sender.tab.id] = "ready";
    }
    else if (request.toggle) {
      toggle();
    } else if (request.showdump) {
      toggleOff();
      showDump();
    } else {
      snippet = {
        content: request.content,
        url: request.url
      };
      snippage.snippets[snippage.snippets.length] = snippet;
      localStorage.setItem('snippage', $.toJSON(snippage));
      updateBadgeText();
    }
    sendResponse({});
  }
);

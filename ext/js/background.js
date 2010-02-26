// Copyright (c) 2009 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

/*
  A snippage is the container for all the snippets the user has collected so
  far, and it's synced to localStorage.
*/
var snippage;

/*
  Id of the 'dump' tab, showing the list of collected snippets, or null if
  not open.
*/
var dump_tab_id;

/*
  Unique id and url of the currently selected tab.
*/
var cur_tab_id;
var cur_tab_url;

/*
  Mapping of tab ids to snippy activation statuses.
  Keeps track of which tabs are currently showing the snippy capture UI.

  It may contain some stale ids, since we don't cleanup this structure
  when the user closes tabs and opens new ones.
*/
var activation = {};

/*
  Mapping of tab ids to readiness statuses (strings).
  We don't want to let the user activate snippy while webpages have not
  finished loading yet (otherwise snippy.js might not be yet available), hence
  we keep track of their readiness status.

  It may contain some stale ids, since we don't cleanup this structure
  when the user closes tabs and opens new ones.
*/
var readiness = {};

/*
  ChromeExOAuth singleton instance to interact with Google services.

  TODO: This is currently bound to a single scope (Google Docs) for the moment.
  Will likely require refactoring whenever we'll need to talk to multiple
  Google services.
*/
var oauth;

/* Gentlemen, start your engines ... */
init();


/*
  Load a snippage saved in a previous session from localStorage. If not found,
  create an empty one. Then:
  - Update the badget text,
  - figure out the tab we're currently on,
  - hook up Chrome event listeners.
*/
function init() {
  snippage = {
   title: '',
   snippets: []
  };

  var stored_page = localStorage.getItem('snippage');
  if (stored_page) {
    snippage = $.evalJSON(stored_page);
  }
  updateBadgeText();
  chrome.tabs.getSelected(null, function(tab) {
    cur_tab_url = tab.url;
    cur_tab_id = tab.id;
  });

  addEventListeners();
}

/*
  Register listeners for all the Chrome events we need.
*/
function addEventListeners() {

  // When the user closes a tab, verify if he's closing the 'dump' tab. If
  // so, null our reference.
  chrome.tabs.onRemoved.addListener(function(tab_id) {
    if (dump_tab_id == tab_id) {
      dump_tab_id = null;
    }
  });

  // If the user selects the 'dump' tab, send it a reload message (the user
  // might have added some snippets since the last time we rendered it).
  //
  // Also update the cur_tab_id and cur_tab_url variables.
  chrome.tabs.onSelectionChanged.addListener(function(tab_id) {
    cur_tab_id = tab_id;
    if (dump_tab_id == tab_id) {
      chrome.tabs.sendRequest(tab_id, {'reload': true}, function(response){});
    }
    chrome.tabs.get(tab_id, function(tab) {
      cur_tab_url = tab.url;
    });
  });

  // Keep track of the readiness status of tabs.
  chrome.tabs.onUpdated.addListener(function(tab_id, change_info) {
    if (change_info.status == "loading") {
      console.log("Readiness of " + tab_id + " is 'loading'");
      readiness[tab_id] = "loading";
    } else if (change_info.status == "complete") {
      console.log("Readiness of " + tab_id + " is 'complete'");
      readiness[tab_id] = "ready";
    }

    // Update the current tab url when the user changes the URL from the
    // location bar.
    if (change_info.url) {
      console.log("chage_info.url for id " + tab_id + ": " + change_info.url);
      cur_tab_url = change_info.url;
    }
  });

  // Handle messages coming from the injected Snippy content script.
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
}


/*
  Toggles snippy activation status on the current tab, and sends a message
  to the tab itself.
*/
function toggle() {
  chrome.tabs.getSelected(null, function(tab) {
    if (activation[tab.id]) {
      activation[tab.id] = false;
      chrome.tabs.sendRequest(tab.id, {'activate': false}, function(response) {});
      console.log('Deactivating on ' + tab.id);
    } else {
      activation[tab.id] = true;
      chrome.tabs.sendRequest(tab.id, {'activate': true}, function(response) {});
      console.log('Activating on ' + tab.id);
    }
  });
}


/*
  Toggles snippy off, if active on the current tab, and notifies the tab.
*/
function toggleOff() {
  chrome.tabs.getSelected(null, function(tab) {
    if (activation[tab.id]) {
      activation[tab.id] = false;
      chrome.tabs.sendRequest(tab.id, {'activate': false}, function(response) {});
      console.log('Deactivating on ' + tab.id);
    }
  });
}


/*
  Activates the 'dump' tab, showing the list of collected snippets.
  If the 'dump' tab already exists, we just shift the focus to it,
  otherwise we open a new one.
*/
function showDump() {
  if (dump_tab_id) {
    chrome.tabs.update(dump_tab_id, { selected: true });
  } else {
    chrome.tabs.create({"url": "dump.html"}, function(tab) {
      dump_tab_id = tab.id;
    });
  }
}


/*
  Returns the current snippage.
*/
function getSnipPage() {
  return snippage;
}


/*
  Persists the current snippage to localStorage.
*/
function updateLocalStorage() {
  localStorage.setItem('snippage', $.toJSON(snippage));
}


/*
  Clears the current snippage and reverts it to a blank one.
  Updates the badge text, removes the snippage from localStorage and
  closes the 'dump' tab (if open).
*/
function clearCopy() {
  snippage.title = '';
  snippage.snippets = [];
  localStorage.removeItem('snippage');
  updateBadgeText();
  if (dump_tab_id) {
    chrome.tabs.remove(dump_tab_id);
  }
}


/*
  Shows the about page.
*/
function about() {
  chrome.tabs.create({"url": "about.html"});
}


/*
  Shows the bugs page.
*/
function bug() {
  chrome.tabs.create({"url": "bug.html"});
}

/*
  Shows the changelog page.
*/
function whatsnew() {
  chrome.tabs.create({"url": "http://code.google.com/p/snippy-extension/wiki/ExtensionWhatsNew"});
}


/*
  Updates the badge text to reflect the number of current snippets.
*/
function updateBadgeText() {
  if (snippage.snippets.length == 0) {
    chrome.browserAction.setBadgeText({'text': ''});
  } else {
    chrome.browserAction.setBadgeText({'text': '' + snippage.snippets.length});
  }
}


/*
  Returns the readiness status of the currently selected tab. It can be
  either 'unknown', 'ready' or 'loading'.
*/
function CurrentTabReadiness() {
  if (!readiness[cur_tab_id]) {
    return "unknown";
  } else {
    return readiness[cur_tab_id];
  }
}


/*
  Returns the url of the currently selected tab.
*/
function CurrentTabUrl() {
  return cur_tab_url;
}

/*
  Returns an initialized ChromeExOAuth instance, creating a new one if needed.
  The instance takes care of persisting itself on localStorage, so we don't need
  to do it here.

  TODO: The OAuth instance we create is a non-registered one which is only
  allowed to talk to Google Docs. This will need refactoring when we'll need to
  talk to multiple OAuth backends.
*/
function getOAuth() {
  if (!oauth) {
    var oauth = ChromeExOAuth.initBackgroundPage({
      'request_url' : 'https://www.google.com/accounts/OAuthGetRequestToken',
      'authorize_url' : 'https://www.google.com/accounts/OAuthAuthorizeToken',
      'access_url' : 'https://www.google.com/accounts/OAuthGetAccessToken',
      'consumer_key' : 'anonymous',
      'consumer_secret' : 'anonymous',
      'scope' : 'http://docs.google.com/feeds/',
      'app_name' : 'Snippy Chrome extension'
    });
  }
  return oauth;
}

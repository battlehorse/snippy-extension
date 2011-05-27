// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

// We don't use jQuery in the popup code, for 2 reasons:
// - including jQuery in popup.html causes the popup to flicker and makes the
//   extension unusable (at least on Mac Os, Chrome 5.0.307.9)
// - we avoid loading and parsing something as big as jQuery to (hopefully) keep
//   the popup fast (no profiling has been done, though).

// Readiness status of the 'current' tab (the tab that is selected when the
// popup is opened.
var ready = false;

/*
  Callback to activate/deactivate snippy selection overlay.
*/
function toggle() {
  if (ready) {
    chrome.extension.getBackgroundPage().toggle();
    window.close();
  }
}

/*
  Callback to display the snippets dump page (also toggles off the snippy
  selection overlay, if active on the current tab).
*/
function showDump() {
  chrome.extension.getBackgroundPage().toggleOff();
  chrome.extension.getBackgroundPage().showDump();
  window.close();
  return false;
}

/*
  Callback to clear the snippets collected so far.
*/
function clearCopy() {
  chrome.extension.getBackgroundPage().clearCopy();
  window.close();
  return false;
}

/*
  Callbacks for static pages.
*/
function about() {
  chrome.extension.getBackgroundPage().about();
  window.close();
  return false;
}

function about_and_disable_update() {
  disable_update_notifications();
  about();
}

function bug() {
  chrome.extension.getBackgroundPage().bug();
  window.close();
  return false;
}

function whatsnew() {
  chrome.extension.getBackgroundPage().whatsnew();
  window.close();
  return false;
}

function whatsnew_and_disable_update() {
  disable_update_notifications();
  whatsnew();
}

function disable_update_notifications() {
  chrome.extension.getBackgroundPage().updateLastSeenAppVersion();
}

/*
  Dismiss the popup that is used to show new features on first-time activations
  and extension updates.
*/
function dismiss_update_popup() {
  disable_update_notifications();
  document.getElementById('standard_actions').style.display = '';
  document.getElementById('update_notifications').style.display = 'none';
  return false;
}


/*
  Recurrent function to monitor the loading status of the current tab.
  Once the tab has been properly loaded, it enables the Snippy activation
  button, allowing users to snip contents on the current tab.
*/
function checkReadyness() {
  var ready_status = chrome.extension.getBackgroundPage().CurrentTabReadiness();
  if (ready_status == "unknown") {
    document.getElementById("not_ready_alert").innerHTML =
      "Please reload the page.";
    ready = false;
    setTimeout("checkReadyness()", 100);
  } else if (ready_status == "ready") {
    ready = true;
    document.getElementById("snip_button").className = "action";
    document.getElementById("snip_text").innerHTML = "Click to Snip!";
    document.getElementById("not_ready_alert").style.display = "none";
  } else {  // loading
    document.getElementById("not_ready_alert").innerHTML =
      "Waiting for page to complete loading...";
    ready = false;
    setTimeout("checkReadyness()", 100);
  }
}

/*
  On-load callback that fires as soon as the popup is rendered.
  It monitors the URL and loading status of the current tab, to decide whether
  Snippy can be activated on it or not.
*/
function loaded() {
  var cur_tab_url = chrome.extension.getBackgroundPage().CurrentTabUrl();
  if (/https:/.test(cur_tab_url)) {
    document.getElementById("not_ready_alert").innerHTML =
      "You can't grab snippets from secure webpages.";
  } else if (!/http:/.test(cur_tab_url)) {
    document.getElementById("not_ready_alert").innerHTML =
      "You can't grab snippets from this page.";
  } else {  // http
    checkReadyness();
  }

  if (chrome.extension.getBackgroundPage().isFirstActivationOrNewRelease()) {
    document.getElementById('standard_actions').style.display = 'none';
    document.getElementById('update_notifications').style.display = '';
  }
}

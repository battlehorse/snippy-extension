// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

$(document).ready(function() {
  $('#snippy-docs-oauth-token').click(function() {
    oauth = chrome.extension.getBackgroundPage().getOAuth();
    oauth.clearTokens();
    $(this).text('Snippy cannot access your Google Docs').
      attr('disabled', 'disabled');
  });


  loop();
});

function loop() {
  // Keep checking for changes in the extension that requires updates
  // to the extension options.
  oauth = chrome.extension.getBackgroundPage().getOAuth();
  if (oauth.hasToken()) {
    $('#snippy-docs-oauth-token').removeAttr('disabled').
      text('Revoke permission');
  } else {
    $('#snippy-docs-oauth-token').text('Snippy cannot access your Google Docs').
      attr('disabled', 'disabled');
  }
  window.setTimeout(loop, 500);
};
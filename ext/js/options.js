// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

$(document).ready(function() {
  // Current oauth access status.
  oauth = chrome.extension.getBackgroundPage().getOAuth();
  if (oauth.hasToken()) {
    $('#snippy-docs-oauth-token').text('Revoke permission').click(function() {
      debugger;
      oauth.clearTokens();
      $(this).text('Snippy cannot access your Google Docs').
        attr('disabled', 'disabled');
    });
  } else {
    $('#snippy-docs-oauth-token').text('Snippy cannot access your Google Docs').
      attr('disabled', 'disabled');
  }
});
// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

// This code contains a pluggable backend, where Snippy can upload snippets to.

// Google Docs backend.
// allows uploading of snippets to Google Docs (http://docs.google.com).
backends.GoogleDocs = function() {
};

/*
  The name, icon and about link for this backend, to be shown in the UI.
*/
backends.GoogleDocs.prototype.name = function() {
  return "Google Docs";
};

backends.GoogleDocs.prototype.icon = function() {
  return "img/backends/googledocs/googledocs_icon.png";
};

backends.GoogleDocs.prototype.aboutLink = function() {
  return "http://www.google.com/google-d-s/tour1.html";
};


/*
  Uploads the given snippage to Google Docs, using GData and OAuth.
  pubMsgCallback is a callback function that accepts a string and publishes
  a message to the user.
*/
backends.GoogleDocs.prototype.upload = function(snippage, pubMsgCallback) {
  // Check whether the snippage is well-formed and within upload limits.
  if (!this.checkSnippageForUpload_(snippage, pubMsgCallback)) {
    return;
  }

  oauth = chrome.extension.getBackgroundPage().getOAuth();
  if (!oauth.hasToken()) {
    // The user has not authorized Snippy to talk to Google Docs yet.
    // Ask for authorization.
    var loginMsg = $('<span />');
    var authLink = $('<a />', {
      href: '#',
      click: function() {
        oauth.authorize(function() {
          pubMsgCallback('You can now upload your snippets.', true);
          chrome.extension.getBackgroundPage().showDump();
        });
        return false;
      }
    }).text('authorize');
    loginMsg.append('Please ').append(authLink).append(
      ' Snippy to access your Google Docs first.');
    pubMsgCallback(loginMsg);
    return;
  } else {
    // We already have an OAuth access token, proceed to document upload.
    this.uploadDocument_(oauth, snippage, pubMsgCallback);
  }
};


/*
  Checks whether a snippage is suitable for upload on Google Docs.
*/
backends.GoogleDocs.prototype.checkSnippageForUpload_ = function(
    snippage, pubMsgCallback) {
  if (snippage.snippets.length == 0) {
    pubMsgCallback('You must have at least one snippet before uploading!');
    return false;
  }
  // Are there any quota limitation on Google Docs upload?
  return true;
};


/*
  Upload a snippage to Google Docs.

  oauth: a ChromeExOAuth instance containing the access credentials.
  snippage: the set of snippets to upload.
  pubMsgCallback: callback to send messages back to the user.
*/
backends.GoogleDocs.prototype.uploadDocument_ = function(oauth,
                                                         snippage,
                                                         pubMsgCallback) {

  var payload = this.buildPayload_('document',
                                   this.getDocumentTitle_(snippage),
                                   this.convertPageToHtml_(snippage));
  oauth.authorize(function(token, tokenSecret) {
    var result = OAuthSimple().sign({
      path: 'http://docs.google.com/feeds/documents/private/full/',
      signatures: {
        consumer_key : 'anonymous',
        shared_secret : 'anonymous',
        oauth_secret : tokenSecret
      },
      action: 'POST',
      parameters: { 'oauth_token': token }
    });
    pubMsgCallback("Uploading...");
    $.ajax({
      type: 'POST',
      url: 'http://docs.google.com/feeds/documents/private/full/',
      contentType: 'multipart/related; boundary=END_OF_PART',
      dataType: 'xml',
      data: payload,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', result.header);
        xhr.setRequestHeader('GData-Version', '2.0');
      },
      error: function(xhr, errcode) {
        pubMsgCallback(
          'Upload failed (' + xhr.status + ' - ' + xhr.statusText + '). ' +
          'Please retry in a few seconds.');
      },
      success: function(data, code, xhr) {
        // Try to extract the document URL from the atom response.
        var docurl = $('entry link[rel=alternate]', data).attr('href');
        if (docurl) {
          pubMsgCallback(
            'Upload successful. ' +
            '<a target="_blank" href="' + docurl + '">' + 'View your item</a>',
            true);
        } else {
          pubMsgCallback(
            'Upload successful. Go to ' +
            '<a target="_blank" href="http://docs.google.com">Google Docs</a>' +
            ' to view your item.',
            true);
        }
      }
    });
  });
};


/*
  Build a multipart payload in the format expected for a Google Doc upload.
  See http://code.google.com/apis/documents/docs/2.0/developers_guide_protocol.html
*/
backends.GoogleDocs.prototype.buildPayload_ = function(docType,
                                                       docTitle,
                                                       body) {
  var mimeType = 'text/html';
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
              '<atom:entry xmlns:atom="http://www.w3.org/2005/Atom">',
              '<atom:category scheme="http://schemas.google.com/g/2005#kind"',
              ' term="http://schemas.google.com/docs/2007#', docType, '" ',
              ' label="', docType, '" />',
              '<atom:title>', docTitle, '</atom:title>',
              '</atom:entry>'].join('');

  var payload = ['--END_OF_PART\r\n',
                  'Content-Type: application/atom+xml;\r\n\r\n',
                  atom, '\r\n',
                  '--END_OF_PART\r\n',
                  'Content-Type: ', mimeType, '\r\n\r\n',
                  body, '\r\n',
                  '--END_OF_PART--\r\n'].join('');
  return payload;
};


/*
  Create a title for the Google Document. Use the snippage title if available,
  otherwise create a title on the fly with the current datetime.
*/
backends.GoogleDocs.prototype.getDocumentTitle_ = function(snippage) {
  if (snippage.title) {
    return snippage.title;
  } else {
    var now = new Date();
    return "Web snippets " + now.toUTCString();
  };
};


/*
  Converts a snippage into HTML.
*/
backends.GoogleDocs.prototype.convertPageToHtml_ = function(snippage) {
  var html = [];
  html.push('<h1 style="font-family: sans-serif">' +
            this.getDocumentTitle_(snippage) + '</h1>');
  this.buildListOfUrls_(html, snippage);
  for (var i = 0; i < snippage.snippets.length; i++) {
    this.buildSnippet_(html, snippage.snippets[i]);
  }
  return html.join('');
};


/*
  Build a list of unique urls the snippets were taken from, and append it to
  the 'html' string array which accumulates the Google doc contents.
*/
backends.GoogleDocs.prototype.buildListOfUrls_ = function(html, snippage) {
  var unique_urls = [];
  for (var i = 0; i < snippage.snippets.length; i++) {
    if ($.inArray(snippage.snippets[i].url, unique_urls) == -1) {
      unique_urls.push(snippage.snippets[i].url);
    }
  }
  if (unique_urls.length > 0) {
    html.push('<p style="' +
              'font-size: 10px' +
              'font-family: sans-serif;' +
              'border: 1px solid #ddd;' +
              'background-color: #eee;' +
              'color: #666;' +
              '">Snippets originally from:<br/>');
    for (var i = 0; i < unique_urls.length; i++) {
      var url = unique_urls[i];
      html.push('<a href="' + url + '">' + url + '</a><br />');
    }
    html.push('</p>');
  }
};


/*
  Converts a single snippet (and its associated comment, if present) into an
  HTML string.
*/
backends.GoogleDocs.prototype.buildSnippet_ = function(html, snippet) {
  html.push('<div>');
  html.push(snippet.content);
  html.push('</div><br />');
  if (snippet.comment) {
    html.push('<div style="clear: both"></div>');
    html.push('<div style="' +
              'font-size: 10px' +
              'font-family: sans-serif;' +
              'border: 1px solid #ddd;' +
              'background-color: #eee;' +
              'color: #666;' +
              '">Comment:');
    html.push(snippet.comment);
    html.push('</div>');
  }
};


// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

// This code contains a pluggable backend, where Snippy can upload snippets to.

// SnipBin backend.
// allows uploading of snippets to snipbin.appspot.com.
backends.Snipbin = function() {
  // Hostname of the SnipBin backend where snippets can be uploaded.
  this.snipbin_host_ = 'http://snipbin.appspot.com';
};

/*
  The name, icon and about link for this backend, to be shown in the UI.
*/
backends.Snipbin.prototype.name = function() {
  return "SnipBin";
};

backends.Snipbin.prototype.icon = function() {
  return "img/icon16.png";
};

backends.Snipbin.prototype.aboutLink = function() {
  return "http://snipbin.appspot.com/about";
};

/*
  Uploads the given snippage to SnipBin.
  pubMsgCallback is a callback function that accepts a string and publishes
  a message to the user.
*/
backends.Snipbin.prototype.upload = function(snippage, pubMsgCallback) {
  // Check whether the snippage is well-formed and within upload limits.
  if (!this.checkSnippageForUpload_(snippage, pubMsgCallback)) {
    return;
  }
  // Check if we are logged in on snipbin
  $.getJSON(this.snipbin_host_ + '/api/loginstatus',
    jQuery.proxy(function(data, textStatus) {
      if (textStatus != 'success') {
        pubMsgCallback('Communication problem with the remote server:' +
                       textStatus);
        return;
      }
      if (data.status == 'not_logged_in') {
        pubMsgCallback(
          "Please " +
            "<a href='" + this.snipbin_host_ + "/extwelcome' target='_blank'>" +
            "login on SnipBin</a> first and then try again.");
        return;
      }

      // We're logged in, proceed with the upload
      pubMsgCallback("Uploading...");
      var payload = snippage;
      $.post(
        this.snipbin_host_ + '/api/upload',
        {'payload': $.toJSON(payload)},
        jQuery.proxy(function(data, textStatus) {
          if (textStatus != 'success') {
            pubMsgCallback('Communication problem with the remote server:' +
                           textStatus);
            return;
          }
          if (data.status == 'ok') {
            pubMsgCallback(
              'Upload successful. ' +
              '<a target="_blank" href="' + this.snipbin_host_ + '/view?key=' +
              data.key + '">' + 'View your item</a>', true);
            return;
          }
          if (data.status == 'request_too_large') {
            pubMsgCallback('Sorry, your snippets are too big. ' +
                           'You can upload up to <b>1Mb</b> to SnipBin.');
            return;
          }
          if (data.status == 'no_snippets') {
            pubMsgCallback('You must have at least one snippet before ' +
                           'uploading!');
            return;
          }
          // generic server error.
          pubMsgCallback('Upload failed. Please try again in a few seconds ' +
                         '(' + data.status + ').');
        }, this), 'json');
    }, this));
};

/*
  Checks whether a snippage is suitable for upload on SnipBin.
*/
backends.Snipbin.prototype.checkSnippageForUpload_ = function(snippage,
                                                              pubMsgCallback) {
  if (snippage.snippets.length == 0) {
    pubMsgCallback('You must have at least one snippet before uploading!');
    return false;
  }
  var payload = $.toJSON(snippage);
  if (payload.length > 1024*1024) {
    var size = (payload.length / (1024*1024)).toFixed(2);
    pubMsgCallback('Sorry, your snippets are too big. ' +
                   'You can upload up to <b>1Mb</b> to SnipBin '+
                   '(your snippets are approximately <b>' + size + 'Mb</b>).');
    return false;
  }

  return true;
};
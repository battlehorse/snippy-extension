// Copyright (c) 2009 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.


/*
  Local reference to the snippage currently shown.
*/
var snippage;


/*
  Default title for the snippage, until the user changes it.
  The default title is stored here, instead of the snippage, so that an empty
  title is submitted if the user does not change the default.
*/
var defaultSnippageTitle = 'My snippets (click here to change the title)';


/*
  Hostname of the SnipBin backend where snippets can be uploaded.
*/
var snipbin_backend = 'http://snipbin.appspot.com';


/*
  Prepare the dump page for display: event handlers, incoming messages and
  layout.
*/
$(document).ready(function() {
  // Wire up event handlers.
  $('.snippage-title').live("click", handleTitleEvents);
  $('.snippet-comment').live('click', handleCommentEvents);
  $('#share-on-snipbin').click(handleShareEvents);

  // Handle messages coming from the background page.
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.reload) {
      doLayout();
    }
    sendResponse({});
  });

  // Do the initial layout
  doLayout();
});


/*
  Refreshes the page layout from the latest snippage available from the
  background page.
*/
function doLayout() {
  // clear the current display.
  $('#snippet-dump').empty();
  $('#snippet-message').text('');

  // grab the latest snippage.
  snippage = chrome.extension.getBackgroundPage().getSnipPage();

  // re-render the page.
  $('.snippage-title').text(snippage.title || defaultSnippageTitle);
  for (var i = 0; i < snippage.snippets.length; i++) {
    var snippet = snippage.snippets[i];
    createSnippetBox(snippage, snippet);
  }

  if (snippage.snippets.length == 0) {
    // no snippetse yet. Render a placeholder.
    createSnippetPlaceholder();
  }
}


/*
  Renders a placeholder to display when there are no snippets yet.
*/
function createSnippetPlaceholder() {
  var snippet_container = $("<div/>", {class: 'snippet-container'});
  $('<p />', {class: 'snippet-paragraph snippet-no-snippet-placeholder'}).
      text('You haven\'t saved any snippet yet. Go grab some!').
      appendTo(snippet_container);
  snippet_container.appendTo('#snippet-dump');
}


/*
  Renders a single snippet.
*/
function createSnippetBox(snippage, snippet) {
  var snippet_container = $("<div/>", {class: 'snippet-container'});

  // Discard icon.
  $("<div/>", {
      class: 'snippet-discard',
      click: function() {
        if (confirm("Delete this snippet?")) {
          var idx = $('.snippet-container').index(snippet_container);
          snippet_container.remove();
          snippage.snippets.splice(idx, 1);
          chrome.extension.getBackgroundPage().updateBadgeText();
          chrome.extension.getBackgroundPage().updateLocalStorage();
          if (snippage.snippets.length == 0) {
            // we removed all the snippets
            createSnippetPlaceholder();
          }
        }
      }}).appendTo(snippet_container);

  // Snippet contents.
  $("<div/>", {class: 'snippet-contents'}).html(snippet.content).
      appendTo(snippet_container);

  // Controls box.
  var snippet_controls = $("<div/>", {class: 'snippet-controls'});
  snippet_controls.appendTo(snippet_container);

  // Source line.
  var snippet_from = $("<div/>", {class: 'snippet-from'}).append("From:");
  $("<a></a>", {href: snippet.url, target: '_blank'}).text(snippet.url).
      appendTo(snippet_from);
  snippet_from.appendTo(snippet_controls);

  // Comment box.
  var snippet_controls_comment = $("<div/>", {class: 'snippet-comment-box'}).
      appendTo(snippet_controls);
  createCommentBox(snippet_controls_comment, snippet.comment);

  snippet_container.appendTo('#snippet-dump');
}


/*
  Renders the comments' box of a single snippet.
*/
function createCommentBox(container, comment_text) {
  container.empty();
  if (comment_text && comment_text) {
    // TODO(battlehorse): comment text should have an nl2br applied to it.
    $("<div />", {class: 'snippet-comment'}).text(comment_text).
      appendTo(container);
  } else {
    $("<a />", {href: '#', class: 'snippet-comment'}).text("Add a comment").
        click(handleCommentEvents).appendTo(container);
  }
}


/*
  Handles user requests to create a new comment or edit an existing one.
*/
function handleCommentEvents() {
  var text = $(this).text();
  var comment_edit_box = $("<div />");
  var textarea = $("<textarea rows='5' cols='50'></textarea>").text(text).
      appendTo(comment_edit_box);
  var save_comment = $("<button>Save</button>").appendTo(comment_edit_box);
  $(this).replaceWith(comment_edit_box);
  textarea.focus().select();
  save_comment.click(function() {
    var comment_text = textarea.val();
    var snippet_container = $(this).closest('.snippet-container');
    var idx = $('.snippet-container').index(snippet_container);
    snippage.snippets[idx].comment = comment_text;
    chrome.extension.getBackgroundPage().updateLocalStorage();

    createCommentBox($(this).closest('.snippet-comment-box'), comment_text);
  });
  return false;
}


/*
  Handles user requests to edit the snippage title.
*/
function handleTitleEvents() {
  var cur_title = $(this).text();
  var text_input = $('<input type="text" class="snippage-title-input" size="50">');
  $(this).replaceWith(text_input);
  text_input.val(cur_title).focus().select();
  $(text_input).keydown(function(evt) {
      var new_title = $(this).val();
      if (evt.which == 13 && new_title.length) {
        createTitle($(this), new_title);
        snippage.title = new_title;
        chrome.extension.getBackgroundPage().updateLocalStorage();
      } else if (evt.which == 27) {
        createTitle($(this), cur_title);
      }
  });
  $(text_input).blur(function() {
      var new_title = $(this).val();
      if (new_title.length) {
        createTitle($(this), new_title);
        if (new_title != defaultSnippageTitle) {
          snippage.title = new_title;
          chrome.extension.getBackgroundPage().updateLocalStorage();
        }
      } else {
        createTitle($(this), cur_title);
      }
  });
}


/*
  Creates a new header with the snippage header.
*/
function createTitle(element_to_replace, title_text) {
  var new_header = $("<h1 class='snippage-title'></h1>").text(title_text);
  element_to_replace.replaceWith(new_header);
}


/*
  Handles user requests to share this snippage online.
*/
function handleShareEvents() {
   // Check whether the snippage is well-formed and within upload limits.
   if (!checkSnippageForUpload()) {
     return;
   }
   // Check if we are logged in on snipbin
   $.getJSON(snipbin_backend + '/api/loginstatus',
     function(data, textStatus) {
       if (textStatus != 'success') {
         publishMessage('Communication problem with the remote server:' + textStatus);
         return;
       }
       if (data.status == 'not_logged_in') {
         publishMessage("Please <a href='" + snipbin_backend + "/extwelcome' target='_blank'>login on SnipBin</a> first and then try again.");
         return;
       }

       // We're logged in, proceed with the upload
       $('#snippet-message').html("Uploading...");
       var payload = snippage;
       $.post(
         snipbin_backend + '/api/upload',
         {'payload': $.toJSON(payload)}, function(data, textStatus) {
           if (textStatus != 'success') {
             publishMessage('Communication problem with the remote server:' + textStatus);
             return;
           }
           if (data.status == 'ok') {
             publishMessage('Upload successful. <a target="_blank" href="' + snipbin_backend + '/view?key=' + data.key + '">View your item</a>');
             return;
           }
           if (data.status == 'request_too_large') {
             publishMessage('Sorry, your snippets are too big. You can upload up to <b>1Mb</b> to SnipBin.');
             return;
           }
           if (data.status == 'no_snippets') {
             publishMessage('You must have at least one snippet before uploading!');
             return;
           }
           // generic server error.
           publishMessage('Upload failed. Please try again in a few seconds (' + data.status + ').');
         }, 'json');
     });
}

function checkSnippageForUpload() {
  if (snippage.snippets.length == 0) {
    publishMessage('You must have at least one snippet before uploading!');
    return false;
  }
  var payload = $.toJSON(snippage);
  if (payload.length > 1024*1024) {
    var size = (payload.length / (1024*1024)).toFixed(2);
    publishMessage('Sorry, your snippets are too big. ' +
                   'You can upload up to <b>1Mb</b> to SnipBin '+
                   '(your snippets are approximately <b>' + size + 'Mb</b>).');
    return false;
  }

  return true;
}

function publishMessage(message) {
  $('#snippet-message').html(message);
}

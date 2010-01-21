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
  Prepare the dump page for display: event handlers, incoming messages and
  layout.
*/
$(document).ready(function() {
  // Wire up event handlers.
  $('.snipbin-title').live("click", handleTitleEvents);
  $('.snippet-comment').live('click', handleCommentEvents);
  $('#snipbin-share').click(handleShareEvents);
  
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
  $('#snipbin-dump').empty();
  $('#snipbin-message').text('');
  
  // grab the latest snippage.
  snippage = chrome.extension.getBackgroundPage().getSnipPage();
  
  // re-rendere the page.
  $('.snipbin-title').text(snippage.title || defaultSnippageTitle);
  for (var i = 0; i < snippage.snippets.length; i++) {
    var snippet = snippage.snippets[i];
    createSnippetBox(snippage, snippet);
  }
}


/*
  Renders a single snippet.
*/
function createSnippetBox(snippage, snippet) {
  var snippet_container = $("<div class='snippet-container'></div>");
  $("<div></div>").html(snippet.content).appendTo(snippet_container);

  var snippet_controls = $("<div class='snipbin-controls'></div>");
  snippet_controls.appendTo(snippet_container);

  var snippet_controls_comment = $("<div></div>").appendTo(snippet_controls);
  if (snippet.comment && snippet.comment.length) { 
    $("<div class='snippet-comment'></div>").text(snippet.comment).
      appendTo(snippet_controls_comment);
  } else {
    $("<a href='#'>Add a comment</a>").click(handleCommentEvents).appendTo(snippet_controls_comment);
  }

  $("<button>Discard</button>").appendTo(snippet_controls).click(function() {
    var idx = $('.snippet-container').index(snippet_container);
    snippet_container.remove();
    snippage.snippets.splice(idx, 1);
    chrome.extension.getBackgroundPage().updateBadgeText();
    chrome.extension.getBackgroundPage().updateLocalStorage();
  });
  $("<span style='margin-left: 0.2em'>This snippet comes from:</span>").appendTo(snippet_controls);
  $("<a></a>").attr('href', snippet.url).attr('target', '_blank').text(snippet.url).
    appendTo(snippet_controls);
  snippet_container.appendTo('#snipbin-dump');
}


/*
  Handles user requests to create a new comment or edit an existing one.
*/
function handleCommentEvents() {
  var text = $(this).text();
  var comment_box = $("<div></div>");
  var textarea = $("<textarea rows='5' cols='50'></textarea>").text(text).appendTo(comment_box);
  var save_comment = $("<button>Save</button>").appendTo(comment_box);
  $(this).replaceWith(comment_box);
  textarea.focus();
  textarea.select();
  save_comment.click(function() {
    var comment_text = textarea.val();
    var snippet_container = $(this).closest('.snippet-container');
    var idx = $('.snippet-container').index(snippet_container);

    // TODO(battlehorse): comment text should have an nl2br applied to it.
    var new_comment_box = $("<div class='snippet-comment'></div>").text(comment_text);
    comment_box.replaceWith(new_comment_box);
    snippage.snippets[idx].comment = comment_text;
    chrome.extension.getBackgroundPage().updateLocalStorage();
  });
  return false;
}


/*
  Handles user requests to edit the snippage title.
*/
function handleTitleEvents() {
  var cur_title = $(this).text();
  var text_input = $('<input type="text" class="snipbin-title-input" size="50">');
  $(this).replaceWith(text_input);
  text_input.val(cur_title);
  text_input.focus();
  text_input.select();
  $(text_input).keydown(function(evt) {
    if (evt.which == 13) { 
      var new_title = $("<h1 class='snipbin-title'></h1>").text($(this).val());
      $(this).replaceWith(new_title);
      snippage.title = $(this).val();
      chrome.extension.getBackgroundPage().updateLocalStorage();
    } else if (evt.which == 27) {
      var new_title = $("<h1 class='snipbin-title'></h1>").text(cur_title);
      $(this).replaceWith(new_title);
    }
  });
  $(text_input).blur(function() {
    var new_title = $("<h1 class='snipbin-title'></h1>").text($(this).val());
    $(this).replaceWith(new_title);
    snippage.title = $(this).val();
    chrome.extension.getBackgroundPage().updateLocalStorage();
  });
}


/*
  Handles user requests to share this snippage online.
*/
function handleShareEvents() {
   // Check if we are logged in on snipbin
   $.getJSON('http://snipbin.appspot.com/api/loginstatus',
     function(data, textStatus) {
       if (textStatus != 'success') {
         alert('Communication problem with the remote server:' + textStatus);         
       } else {
         if (data.status == 'not_logged_in') {
           $('#snipbin-message').html("Please <a href='http://snipbin.appspot.com/extwelcome' target='_blank'>login on SnipBin</a> first and then try again.");
         } else {
           $('#snipbin-message').html("Uploading...");
           var payload = snippage;
           $.post('http://snipbin.appspot.com/api/upload',
             {'payload': $.toJSON(payload)}, function(data, textStatus) {
               if (textStatus != 'success') {
                 alert('Communication problem with the remote server:' + textStatus);
               } else {
                 if (data.status == 'ok') {
                   $('#snipbin-message').html('Upload successful. <a target="_blank" href="http://snipbin.appspot.com/view?key=' + data.key + '">View your item</a>');
                 } else {
                   $('#snipbin-message').html('Upload failed: ' + data.status);
                 }
               }
             }, 'json');
         }
       }
     });
  
}
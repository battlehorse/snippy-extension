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
  List of backends where snippets can be uploaded to.
*/
var backendsList = [];


/*
  Prepare the dump page for display: event handlers, incoming messages and
  layout.
*/
$(document).ready(function() {
  // Wire up event handlers.
  $('.snippage-title').live("click", handleTitleEvents);
  $('.snippet-comment').live('click', handleCommentEvents);
  $('.snippet-discard-all').click(handleDiscardAll);

  // Handle messages coming from the background page.
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.reload) {
      doLayout();
    }
    sendResponse({});
  });

  // Populate the list of supported backends
  $.each(backends, function(backend, ctor) {
    backendsList.push(new ctor());
  });

  // Create upload buttons for all the backends we have.
  createBackendButtons();

  // Do the initial layout
  doLayout();
});

/*
  Creates an upload button for each supported backend. Each button includes a name,
  an icon, and an about link to learn more about the specific backend.
*/
function createBackendButtons() {
  $.each(backendsList, function(backend, impl) {
    var backendBox = $('<span />').css({
      'display': 'inline-block',
      'vertical-align': 'middle'
    });
    $('<button />').
      append($('<img />', {src: impl.icon()})).
      append($('<b/>').text(impl.name())).
      click(function() {
        impl.upload(snippage, publishMessage);
      }).appendTo(backendBox);
    $('<br />').appendTo(backendBox);
    $('<a />', {href: impl.aboutLink(), target: '_blank'}).text('Learn More').
      appendTo(backendBox);
    $('#snippet-backends').append(backendBox);
  });
}


/*
  Refreshes the page layout from the latest snippage available from the
  background page.
*/
function doLayout() {
  // clear the current display.
  $('#snippet-dump').empty();
  if (!$('#snippet-message').hasClass('snippet-persistent')) {
    $('#snippet-message').text('');
  } else {
    $('#snippet-message').removeClass('snippet-persistent');
  }

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
  Handles user requests to discard all snippets.
*/
function handleDiscardAll() {
  if (snippage.snippets.length > 0 && confirm("Delete all snippets?")) {
    $('.snippet-container').remove();
    snippage.snippets = [];
    chrome.extension.getBackgroundPage().updateBadgeText();
    chrome.extension.getBackgroundPage().updateLocalStorage();
    createSnippetPlaceholder();
  }
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
  A callback that will be passed to upload backends for them to signal events
  to the user. Accepts plain strings, DOM elements or JQuery instances.
*/
function publishMessage(message, opt_persistent) {
  $('#snippet-message').empty().append(message);
  if (opt_persistent) {
    $('#snippet-message').addClass('snippet-persistent');
  } else {
    $('#snippet-message').removeClass('snippet-persistent');
  }
}

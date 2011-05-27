// Copyright (c) 2009 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.


/*
  Defines whether the snippy selection overlay is currently moving or not.
*/
var is_animating = false;


/*
  Pointer to the HTML element which contains the snippy selection overlay.
*/
var sel_overlay;


/*
  Pointer to the HTML element which contains the in-page tooltip popup.
*/
var tooltip_box;


/*
  Pointer to the HTML element that represents the currently selected block,
  i.e. the one the overlay was created from.
*/
var cur_enclosing_block;


/*
  Detects whether the modifier key (ctrl or command depending on the platform)
  is currently pressed or not.
  Used to detect composite keypresses such as Ctrl+<key>
*/
var modifier_activated = false;
var modifier_key;


// Wire everything up.
$(document).ready(function() {
    // Create snippy controls
    createTooltipBox();

    // Start listening for activations via keyboard shortcuts
    createKeyboardShortcuts();

    // A 0-width div to contain the snippy selection overlay before it's
    // triggered for the first time.
    var initial_div = $("<div />", {id: 'snippy-initial'}).css({
      'width': '0',
      'height': '0',
      'border': '0'
    }).appendTo(document.body);

    sel_overlay = $("<div />", {id: 'snippy-overlay'}).css({
      'backgroundColor': 'blue',
      'opacity': '0.1',
      'border': '1px solid black',
      'position': 'absolute',
      'zIndex': '-10000',
      'visibility': 'hidden',
      'top': '0',
      'left': '0',
      'width': '100px',
      'height': '100px'
    }).click(overlayClicked).appendTo(initial_div).get(0);

    // Initially set the current enclosing block to the initial div.
    cur_enclosing_block = initial_div.get(0);

    // Listen to messages coming from the background page. The only expected
    // message is to activate/deactivate the content grabber.
    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
      if (request.activate) {
        // Display snippy controls
        show(tooltip_box, '20000');
        show(sel_overlay, '10000');

        // Tag selectable elements
        jQuery.each(SELECTABLE_TAGS, function(i, tagName) {
          $(tagName).addClass('snippy-block');
        });

        // Start listening to mouse movement events.
        $(document).bind('mousemove.snippy', handleMouseMovement);

        // Start listening to key cancel events.
        $(document).bind('keydown.snippy', handleCancelEvents);
      } else {
        // Stop listening to mouse movements and key cancel events.
        $(document).unbind('mousemove.snippy');
        $(document).unbind('keydown.snippy');

        // untag elements
        jQuery.each(SELECTABLE_TAGS, function(i, tagName) {
          $(tagName).removeClass('snippy-block');
        });

        // hide controls
        hide(sel_overlay, '-10000');
        hide(tooltip_box, '-20000');
      }
      sendResponse({});
    });

    // Notify the extension that the page has been instrumented and
    // snippy is ready to be activated.
    // This point is reached before the Chrome 'complete' event, so we can
    // shave a few milliseconds in enabling Snippy now.
    chrome.extension.sendRequest({'ready': true}, function(response) {});
});


function show(element, zIndex) {
  $(element).css({'zIndex': zIndex, 'visibility': 'visible'});
}


function hide(element, zIndex) {
  $(element).css({'zIndex': zIndex, 'visibility': 'hidden'});
}


/*
  Handles user requests to dismiss Snippy selection via keyboard shortcuts.
*/
function handleCancelEvents(evt) {
  if (evt.which == 27) {  // ESC key
    chrome.extension.sendRequest({'toggle': true}, function(response) {});
  }
}


/*
  Updates the position of the selection overlay following mouse movement.
*/
function handleMouseMovement(evt) {
    if (is_animating) {
      return;
    }
    if (evt.target.id == 'snippy-overlay') {
      // The mouse is currently inside the selection overlay.
      // We need to manually search for the source of the event, which
      // is underneath it.
      var inner_block = cur_enclosing_block;
      var sel_el = asSelectable(cur_enclosing_block);
      $('.snippy-block', sel_el.searchDomain(cur_enclosing_block)).each(function() {
          var top = $(this).offset().top;
          var left = $(this).offset().left;
          var right = left + $(this).width();
          var bottom = top + $(this).height();
          if (evt.pageX >= left && evt.pageX <= right &&
              evt.pageY >= top && evt.pageY <= bottom) {
            inner_block = $(this).get(0);
          }
        });
      cur_enclosing_block = inner_block;
      var bounding_box = sel_el.overlayBoundingBox(cur_enclosing_block);
      reposition_overlay(100, bounding_box);
    } else {
      // The mouse is elsewhere, possibly over a selectable element.
      var enclosing_block = $(evt.target).closest('.snippy-block');
      if (enclosing_block && enclosing_block.length > 0) {
        cur_enclosing_block = enclosing_block.get(0);
        var sel_el = asSelectable(cur_enclosing_block);
        var bounding_box = sel_el.overlayBoundingBox(cur_enclosing_block);
        reposition_overlay(100, bounding_box);
      }
    }
}


/*
  When the overlay is clicked, we clone the selected contents and save them
  as a snippet.

  A bit of preprocessing occurs at this step: First, all the selected elements
  are cloned while preserving their computed style (to guarantee a snippet
  as similar to the original content as possible).

  Then, all sort of relative links and anchors are
*/
function overlayClicked() {
  var sel_el = asSelectable(cur_enclosing_block);
  var copy_els = sel_el.clippableElements(cur_enclosing_block).get();
  var clones = $(copy_els).clone().get();
  for (var i = 0; i < copy_els.length; i++) {
    recursiveRebaseStyles(copy_els[i], clones[i]);
  }
  var clone;
  if (clones.length > 1) {
    clone = $("<div/>").append(clones).get(0);
  } else {
    clone = clones[0];
  }
  rebaseLinks(clone);
  rebaseImages(clone);
  removeScripts(clone);

  chrome.extension.sendRequest({
    'content': $(clone).html(),
    'url': document.location.href
  }, function(response) {});
  $(this).animate({'opacity': 0.5}, 100, "swing", function() {
      $(this).animate({'opacity': 0.1}, 100);
  });
}


/*
  Assignes each to each element cloned from the user selection its computed
  style. This is required because the extraction of the snippet from its
  containing page would otherwise break the CSS cascading model.
*/
function recursiveRebaseStyles(base, clone) {
  var computedStyle = window.getComputedStyle(base);
  var props = {};
  jQuery.each(computedStyle, function(k,v) {
      // exclude all the non-standard styles, and positioning directives.
      if (!/^-webkit/.test(v) && !/position|bottom|top|left|right/.test(v)) {
        props[v] = computedStyle[v];
      }
    });
  $(clone).css(props);
  var base_children = $(base).children().get();
  var clone_children = $(clone).children().get();
  for (var i = 0; i < base_children.length; i++) {
    recursiveRebaseStyles(base_children[i], clone_children[i]);
  }
}


/*
  Transform all anchors and relative links into absolute ones, to ensure
  they still work when extracted into the snippet.
*/
function rebaseLinks(el) {
  $('a', el).each(function() {
      href = $(this).attr('href');
      if (!href) {
        return;
      }
      $(this).attr('target', '_blank');
      if (href.charAt(0) == '/') {  // relative-to-root link
        $(this).attr('href',
                     document.location.protocol + '//' +
                     document.location.host + href);
      } else if (href.charAt(0) == '#') {  // anchor
        $(this).attr('href',
                     document.location.href + href);
      } else if (!/^https?/.test(href)) {  // relative link
        $(this).attr(
            'href',
            document.location.href.substring(
                0,
                document.location.href.lastIndexOf('/')) + '/' + href);
      }
  });
}


/*
  Transform all relative image sources into absolute ones.
*/
function rebaseImages(el) {
  $('img', el).each(function() {
      src = $(this).attr('src');
      if (!src) {
        return;
      }
      if (src.charAt(0) == '/') {
        $(this).attr('src',
                     document.location.protocol + '//' +
                     document.location.host + src);
      } else if (!/^https?/.test(src)) {
        $(this).attr(
            'src',
            document.location.href.substring(
                0,
                document.location.href.lastIndexOf('/')) + '/' + src);
      }
  });
}


/*
  Remove (potentially dangerous) dynamic content from the page.

  TODO(battlehorse): this is very naive. Should also remove all event handlers,
  links using the javascript: protocol, and a million other potential cases.
*/
function removeScripts(el) {
  $('script', el).remove();
}


/*
  Moves the selectin overlay over the cur_enclosing_block, optionally using an
  animation.
*/
function reposition_overlay(duration, bounding_box) {
  if (duration == 0) {
    $(sel_overlay).css({top: bounding_box.top,
                        left: bounding_box.left,
                        width: bounding_box.w,
                        height: bounding_box.h});
  } else {
    is_animating = true;
    $(sel_overlay).animate({top: bounding_box.top,
                            left: bounding_box.left,
                            width: bounding_box.w,
                            height: bounding_box.h},
      duration, "swing", function() {
        is_animating = false;
      }
    );
  }
}


/*
  Create keyboard shortcuts to activate and use Snippy via the keyboard.
*/
function createKeyboardShortcuts() {
  if (navigator.platform.indexOf("Mac") == -1) {
    // Win or Linux, use ctrl.
    modifier_key = 17;
  } else {
    modifier_key = 18;  // Mac, use 'command'.
  }

  $(document).keyup(function(evt) {
    if (evt.which == modifier_key) modifier_activated = false;
  }).keydown(function(evt) {
    if (evt.which == modifier_key) modifier_activated = true;
    if (modifier_activated && evt.which == 32) {  // 'space' key
      chrome.extension.sendRequest({'toggle': true}, function(response) {});
    }
  });
}


/*
  Creates the contents of the in-page tooltip popup, displayed whenever Snippy
  activates.
*/
function createTooltipBox() {
  tooltip_box = $("<div />", {id: 'snippy-tooltip-div'}).
      css({'background-color': 'white',
           'border': '1px solid #444',
           '-webkit-border-radius': '5px',
           '-webkit-box-shadow': '5px 5px 5px #aaa',
           'z-index': -20000,
           'position': 'fixed',
           'visibility': 'hidden',
           'top': 5,
           'right': 5,
           'width': '150px',
           'height': '150px',
           'padding': '0.5em'
        });

  // Help blurb.
  $("<div />").css({
    'font-size': '11px',
    'font-family': 'sans-serif',
    'color': 'black',
    'text-align': 'left'
  }).html(
    '<b>Move</b> your mouse, and <b>click</b> on interesting elements to save ' +
    'them as snippets.'
  ).appendTo(tooltip_box);

  // Snip-it button.
  var tooltip_button = $("<div />", {
    click: function() {
      chrome.extension.sendRequest({'toggle': true}, function(response) {});
    }
  }).css({
    background: 'transparent url(' +
                chrome.extension.getURL('img/grad.png') +
                ') repeat-x top left',
    width: '120px',
    height: '22px',
    'border-radius': '2px',
    'border-top': '1px solid rgb(103, 140, 255)',
    'border-left': '1px solid rgb(103, 140, 255)',
    'border-right': '1x solid rgb(7, 32, 174)',
    'border-bottom': '1x solid rgb(7, 32, 174)',
    'text-align': 'center',
    'padding': '0.3em',
    'margin-bottom': '0.5em',
    'font-size': '14px',
    'font-weight': 'bold',
    'color': 'white',
    'text-decoration': 'none',
    'cursor': 'pointer'
  }).css('-webkit-box-shadow', '2px 2px 3px #aaa').appendTo(tooltip_box);

  // Button image and text.
  $("<img />", {
    src: chrome.extension.getURL("img/snipit.png"),
    style: 'vertical-align: bottom-text; padding-right: 5px; display: inline'
    }).appendTo(tooltip_button);
  $("<span />").text("Done").appendTo(tooltip_button);

  // Direct link to dump page.
  $("<a />", {
    href: '#',
    click: function() {
      chrome.extension.sendRequest({'showdump': true}, function(response) {});
    }
  }).css({
    'font-size': '11px',
    'font-family': 'sans-serif',
    'color': 'blue',
    'font-weight': 'normal',
    'text-align': 'left'
  }).text('Show current snippets').appendTo(tooltip_box);

  tooltip_box = tooltip_box.get(0);
  document.body.appendChild(tooltip_box);
}

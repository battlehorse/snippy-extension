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
  i.e. the one that will be copied on user click.
*/
var cur_enclosing_block;

/*
  List of elements that the selection overlay can focus on.
*/
var selectable_elements = ["p", "div", "li", "ul", "ol", "td", "tr", "table"];


// Wire everything up.
$(document).ready(function() {
    // Create snippy controls
    createTooltipBox();

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
    }).click(overlayClicked).get(0);

    // A 0-width div to contain the snippy selection overlay before it's
    // triggered for the first time.
    var initial_div = $("<div />", {id: 'snippy-initial'}).css({
      'width': '0',
      'height': '0',
      'border': '0'
    }).appendTo(document.body);

    // Initially set the current enclosing block to the initial div.
    cur_enclosing_block = initial_div.get(0);
    cur_enclosing_block.appendChild(sel_overlay);
    
    // Listen to messages coming from the background page. The only expected
    // message is to activate/deactivate the content grabber.
    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
      if (request.activate) {
        // Display snippy controls
        show(tooltip_box, '20000');
        show(sel_overlay, '10000');

        // Tag selectable elements
        for (var i = 0; i < selectable_elements.length; i++) {
          $(selectable_elements[i]).addClass('snippy-block');
        }

        // Start listening to mouse movement events.
        $(document).mousemove(handleMouseMovement);
      } else {
        // Stop listening to mouse movements
        $(document).unbind('mousemove');

        // untag elements
        for (var i = 0; i < selectable_elements.length; i++) {
          $(selectable_elements[i]).removeClass('snippy-block');
        }

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
      $('.snippy-block', cur_enclosing_block).each(function() {
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
      reposition_overlay(100);
    } else {
      // The mouse is elsewhere, possibly over a selectable element.
      var enclosing_block = $(evt.target).closest('.snippy-block');
      if (enclosing_block && enclosing_block.length > 0) {
        cur_enclosing_block = enclosing_block.get(0);
        reposition_overlay(100);
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
  var clone = $(cur_enclosing_block).clone().get(0);
  recursiveRebaseStyles(cur_enclosing_block, clone);
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
function reposition_overlay(duration) {
  var top = $(cur_enclosing_block).offset().top;
  var left = $(cur_enclosing_block).offset().left;
  var w = $(cur_enclosing_block).width();
  var h = $(cur_enclosing_block).height();

  if (duration == 0) {
    $(sel_overlay).css({top: top, left: left, width: w, height: h});
  } else {
    is_animating = true;
    $(sel_overlay).animate({top: top, left: left, width: w, height: h},
      duration, "swing", function() {
        is_animating = false;
      }
    );
  }
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
    'font-family': 'sans-serif'
  }).text(
    'Move your mouse over the page and click on interesting elements to save ' +
    'them as snippets. Click Done once finished.'
  ).appendTo(tooltip_box);

  // Snip-it button.
  var tooltip_button = $("<button />", {
    style: 'width: 100px',
    click: function() {
      chrome.extension.sendRequest({'toggle': true}, function(response) {});
    }
    }).appendTo(tooltip_box);
  $("<img />", {
    src: chrome.extension.getURL("img/snipit.png"),
    style: 'vertical-align: bottom-text'
    }).appendTo(tooltip_button);
  $("<span />").text("Done").appendTo(tooltip_button);

  // Direct link to dump page.
  $("<br />").appendTo(tooltip_box);
  $("<a />", {
    href: '#',
    style: 'font-size: 11px; font-family: sans-serif',
    click: function() {
      chrome.extension.sendRequest({'showdump': true}, function(response) {});
    }
  }).text('Show current snippets').appendTo(tooltip_box);

  tooltip_box = tooltip_box.get(0);
  document.body.appendChild(tooltip_box);
}

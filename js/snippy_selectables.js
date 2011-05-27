// Copyright (c) 2010 Riccardo Govoni. All rights reserved.
// Use of this source code is governed by the MIT License and Creative Commons
// Attribution License 3.0. Both of them can be found in the LICENSE file.

snippy = {};  // namespace

/*
  This package defines selectable entities. A selectable entity is an HTML
  element that can be targeted by Snippy and drives the Snippy overlay in
  response to user interactions with the entity itself.

  Moving the mouse over a selectable entity will cause the overlay to be
  repositioned. Clicking a selectable entity will cause Snippy to clip
  the contents marked by the overlay.

  For most block elements (P, DIV, ...), when the mouse enters the selectable,
  the overlay will be resized to cover the entity itself and nothing more.

  For other elements (most notably headers like H1 .. H6), entering the
  selectable causes the overlay to cover a bigger area. For example, moving
  the mouse over an header will cover also the section below the header
  (e.g.: all the header siblings until the next header of the same level).

  The classes SelectableElement and SelectableSection capture these two
  behaviours.

  Defining a new selectable entity requires the definition of a new stateless
  object with these methods:

  - overlayBoundingBox(el): receives as input the HTMLElement currently
    selected, and returns an object representing the bounding box the
    overlay should cover. The bounding box is an object with the following
    properties: top, left, w, h.

  - searchDomain(el): receives as input the HTMLElement currently
    selected, and returns a JQuery object pointing to the domain of objects
    to be searched to identify a new element to select. (this is called when
    the mouse moves within the overlay, because the overlay masquerades
    the underlying elements.

  - clippableElements(el): recevies as input the HTMLElement currently
    selected, and returns a JQuery object pointing to the set of elements
    to clip if the user were to click on the element.
*/

/*
  List of elements that the selection overlay can focus on, and associated
  overlay behaviour.
*/
var SELECTABLES;
var SELECTABLE_TAGS = [];

function asSelectable(el) {
  var tagName = el.tagName.toUpperCase();
  return SELECTABLES[tagName];
}

(function() {
  // SelectableElement
  snippy.SelectableElement = function() {};

  snippy.SelectableElement.prototype.overlayBoundingBox = function(el) {
    var offset = $(el).offset();
    return {
      top: offset.top,
      left: offset.left,
      w: $(el).width(),
      h: $(el).height()
    };
  };

  snippy.SelectableElement.prototype.searchDomain = function(el) {
    return $(el);
  };

  snippy.SelectableElement.prototype.clippableElements = function(el) {
    return $(el);
  };

  // SelectableSection
  snippy.SelectableSection = function() {};
  snippy.SelectableSection.prototype.overlayBoundingBox = function(el) {
    var top = $(el).offset().top;
    var left = $(el).offset().left;
    var right = left + $(el).width();
    var bottom = top + $(el).height();
    $(el).nextUntil(el.tagName).andSelf().each(function() {
      top = Math.min(top, $(this).offset().top);
      left = Math.min(left, $(this).offset().left);
      right = Math.max(right, $(this).offset().left + $(this).width());
      bottom = Math.max(bottom, $(this).offset().top + $(this).height());
    });
    var w = right - left;
    var h = bottom - top;

    return {
      top: top,
      left: left,
      w: w,
      h: h
    };
  };

  snippy.SelectableSection.prototype.searchDomain = function(el) {
    return $(el).parent();
  };

  snippy.SelectableSection.prototype.clippableElements = function(el) {
    return $(el).nextUntil(el.tagName).andSelf();
  };

  // singleton instances
  SEL_EL = new snippy.SelectableElement();
  SEL_SEC = new snippy.SelectableSection();

  SELECTABLES = {
    'P': SEL_EL,
    'DIV': SEL_EL,
    'LI': SEL_EL,
    'UL': SEL_EL,
    'OL': SEL_EL,
    'TD': SEL_EL,
    'TR': SEL_EL,
    'TABLE': SEL_EL,
    'H1': SEL_SEC,
    'H2': SEL_SEC,
    'H3': SEL_SEC,
    'H4': SEL_SEC,
    'H5': SEL_SEC,
    'H6': SEL_SEC
  };

  for (var tagName in SELECTABLES) {
    SELECTABLE_TAGS.push("" + tagName);
  }
})();

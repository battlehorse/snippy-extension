var is_animating = false;
var div;
var tooltip_div;
var cur_enclosing_block;
$(document).ready(function() {
    tooltip_div = $("<div id='snippy-tooltip-div'></div>").
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
    $("<div style='font-size: 11px; font-family: sans-serif'>Move your mouse over the page and click on interesting elements to save them as snippets. Click Done once finished.</div>").appendTo(tooltip_div);
    var tooltip_button = $("<button style='width: 100px'></button>").
        html("<img src='" + chrome.extension.getURL("snipit.png") + "' style='vertical-align: bottom-text'><span>Done</span>");
    tooltip_button.appendTo(tooltip_div);
    tooltip_button.click(function() {
        chrome.extension.sendRequest({'toggle': true}, function(response) {});
    });
    $("<br />").appendTo(tooltip_div);
    $("<a href='#' style='font-size: 11px; font-family: sans-serif'>Show current snippets</a>").click(function() {
        chrome.extension.sendRequest({'showdump': true}, function(response) {});
    }).appendTo(tooltip_div);

    tooltip_div = tooltip_div.get(0);
    document.body.appendChild(tooltip_div);

    div = document.createElement("DIV");
    div.style.backgroundColor = 'blue';
    div.style.opacity = 0.1;
    div.style.border = '1px solid black';
    div.style.position = 'absolute';
    div.id = 'snippy-overlay';
    div.style.zIndex = -10000;
    div.style.visibility = 'hidden';
    div.style.top = 0;
    div.style.left = 0;
    div.style.width = '100px';
    div.style.height = '100px';

    var initial_div = document.createElement("DIV");
    initial_div.style.width = '0';
    initial_div.style.height = '0';
    initial_div.style.border = '0';
    document.body.appendChild(initial_div);

    cur_enclosing_block = initial_div;
    cur_enclosing_block.appendChild(div);

    $(div).click(function() {
        var clone = rebaseStyles(cur_enclosing_block);
        rebaseLinks(clone);
        rebaseImages(clone);
        removeScripts(clone);
        // rebaseLinks(cur_enclosing_block);
        // rebaseImages(cur_enclosing_block);
        // removeScripts(cur_enclosing_block);
        
        chrome.extension.sendRequest(
            {'content': $(clone).html(),
             'url': document.location.href
            },
            function(response) {});
        $(this).animate({'opacity': 0.5}, 100, "swing", function() {
            $(this).animate({'opacity': 0.1}, 100);
        });
    });
    chrome.extension.sendRequest({'ready': true}, function(response) {});
});

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
    if (request.activate) {
      tooltip_div.style.zIndex = 20000;
      tooltip_div.style.visibility = 'visible';

      div.style.zIndex = 10000;
      div.style.visibility = 'visible';
      $("p").addClass('snippy-block');
      $("div").addClass('snippy-block');
      $("li").addClass('snippy-block');
      $("ul").addClass('snippy-block');
      $("ol").addClass('snippy-block');
      $("td").addClass('snippy-block');
      $("tr").addClass('snippy-block');
      $("table").addClass('snippy-block');
      //$('.snippy-block').addClass('passed');
      $().mousemove(function(evt) {
          if (is_animating) {
            return;
          }
          if (evt.target.id == 'snippy-overlay') {
            var inner_block = cur_enclosing_block;
            $('.snippy-block', cur_enclosing_block).each(function() {
                var top = $(this).offset().top;
                var left = $(this).offset().left;
                var right = left + $(this).width();
                var bottom = top + $(this).height();
                if (evt.pageX >= left && evt.pageX <= right &&
                    evt.pageY >= top && evt.pageY <= bottom) {
                  // mouse is inside the block
                  // if (top >= $(inner_block).offset().top &&
                  //     bottom <= $(inner_block).offset().top + $(inner_block).height() &&
                  //     left >= $(inner_block).offset().left &&
                  //     right <= $(inner_block).offset().left + $(inner_block).width()) {
                  //   inner_block = $(this).get(0);
                  // }
                  inner_block = $(this).get(0);
                }
              });
            cur_enclosing_block = inner_block;
            var top = $(inner_block).offset().top;
            var left = $(inner_block).offset().left;
            var w = $(inner_block).width();
            var h = $(inner_block).height();
            snippymove(div, top, left, w, h, 100);
          } else {
            var enclosing_block = $(evt.target).closest('.snippy-block');
            if (enclosing_block && enclosing_block.length > 0) {
              cur_enclosing_block = enclosing_block.get(0);
              var top = enclosing_block.offset().top;
              var left = enclosing_block.offset().left;
              var w = enclosing_block.width();
              var h = enclosing_block.height();
              snippymove(div, top, left, w, h, 100);
            }
          }
      });


    } else {
      $().unbind('mousemove');
      $("p").removeClass('snippy-block');
      $("div").removeClass('snippy-block');
      $("li").removeClass('snippy-block');
      $("ul").removeClass('snippy-block');
      $("ol").removeClass('snippy-block');
      $("td").removeClass('snippy-block');
      $("tr").removeClass('snippy-block');
      $("table").removeClass('snippy-block');
      div.style.visibility = 'hidden';
      div.style.zIndex = -10000;

      tooltip_div.style.visibility = 'hidden';
      tooltip_div.style.zIndex = -20000;
    }
    sendResponse({});
  }
);

function rebaseLinks(el) {
  $('a', el).each(function() {
      href = $(this).attr('href');
      if (!href) {
        return;
      }
      $(this).attr('target', '_blank');
      if (href.charAt(0) == '/') {
        $(this).attr('href',
                     document.location.protocol + '//' +
                     document.location.host + href);
      } else if (href.charAt(0) == '#') {
        $(this).attr('href',
                     document.location.href + href);
      } else if (!/^https?/.test(href)) {
        $(this).attr(
            'href',
            document.location.href.substring(
                0,
                document.location.href.lastIndexOf('/')) + '/' + href);
      }
  });
}

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

function rebaseStyles(el) {
  var clone = $(el).clone().get(0);
  recursiveRebaseStyles(el, clone);
  return clone;
  // debugger;
  // $('*', el).each(function() {
  //     domelem = $(this).get(0);
  //     var computedStyle = window.getComputedStyle(domelem, null);
  //     var props = {}
  //     jQuery.each(computedStyle, function(k,v) {
  //         props[v] = computedStyle[v];
  //     });
  //     $(domelem).css(props);
  // });
}

function recursiveRebaseStyles(base, clone) {
  var computedStyle = window.getComputedStyle(base);
  var props = {}
  jQuery.each(computedStyle, function(k,v) {
      if (!/^-webkit/.test(v) && !/position|bottom|top|left|right/.test(v)) {  // exclude all the non-standard styles.
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

function removeScripts(el) {
  $('script', el).remove();
  //TODO(battlehorse): also remove all event handlers and links using the javascript: protocol
}

function snippymove(el, top, left, w, h, duration) {
  if (duration == 0) {
    el.style.top = top;
    el.style.left = left;
    el.style.width = w;
    el.style.height = h;
  } else {
    is_animating = true;
    $(el).animate({
     top: top,
     left: left,
     width: w,
     height: h
    }, duration, "swing", function() {
      is_animating = false;
    });
  }
}

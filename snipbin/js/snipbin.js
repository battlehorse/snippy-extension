$(document).ready(function() {
  if (logged_in) {
    $(".abuse").click(function () {
      var link = this;
      var form = $(this).closest(".snippet-form");
      var key = $("input[name='key']", form).val();
      var textarea = $("<textarea />", {rows:'10', cols:'50'});
      var container = $("<div/>");
      $("<p>Please give us some details about this abuse report.</p>").appendTo(container);
      textarea.appendTo(container);
      var okButton = $("<button>Submit</button>");
      var cancelButton = $("<button>Cancel</button>");
      var feedback = $("<span/>");
      $("<div/>").append(cancelButton).append(okButton).append(feedback).appendTo(container);
      var boxy = new Boxy(container, {title: "Report Abuse", draggable: false, modal: true});
      cancelButton.click(function() {
        boxy.hideAndUnload();
      });
      okButton.click(function() {
        var report = textarea.val();
        if (jQuery.trim(report).length == 0) {
          feedback.text("Please write something.");
          return;
        }
        feedback.text("Submitting ...");
        var data = {
          'key': key,
          'report': report,
          'xsrf_token': $('#xsrf_token').val()
        };
        $.post('/api/reportabuse', {'payload': $.toJSON(data)}, function(data, textStatus) {
          if (data.status == 'ok') {
            feedback.text('Thanks.');
            boxy.hideAndUnload();
          } else {
            feedback.text(data.status);
          }
        }, 'json');
      });
      boxy.show();
      textarea.focus();
      return false;
    });
  } else {
    $(".abuse").click(function() {
      var container = $("<div/>");
      $("<p>You must log in to submit abuse reports.</p>").appendTo(container);
      var okButton = $("<button>Ok</button>").appendTo(container);
      var boxy = new Boxy(container, {title: "Report Abuse", draggable: false, modal: true});
      okButton.click(function() {
        boxy.hideAndUnload();
      });
      return false;
    });
  }
  $(".public, .private").click(function() {
    var form = $(this).closest(".snippet-form");
    var key = $("input[name='key']", form).val();
    var pub = $("input[name='public']", form).val() == 'True';
    var data = {
      'key': key,
      'public': !pub,
      'xsrf_token': $('#xsrf_token').val()
    };
    $.post('/api/togglepublic', {'payload': $.toJSON(data)}, function(data, textStatus) {
      if (data.status == 'ok') {
        if (pub) {
          // Was public, turned private
          $('#' + key).find('.public').fadeOut("fast", function() {
            $('#' + key).find('.private').fadeIn("fast");
          });
        } else  {
          // Was private, turned public
          $('#' + key).find('.private').fadeOut("fast", function() {
            $('#' + key).find('.public').fadeIn("fast");
          });
        }
        $('#' + key).find("input[name='public']").val(pub ? "False" : "True")
      }
    }, 'json');
    return false;
  });
  $(".delete").click(function() {
    var is_list = $(this).hasClass("deletelist");
    var form = $(this).closest(".snippet-form");
    var key = $("input[name='key']", form).val();
    var data = {
      'key': key,
      'xsrf_token': $('#xsrf_token').val()
    }
    if (confirm('Do you want to delete this item?')) {
      $.post('/api/delete', {'payload': $.toJSON(data)}, function(data, textStatus) {
        if (data.status == 'ok') {
          if (is_list) {
            // We're deleting a snippet from a list.
            $('#' + key).closest('li').fadeOut('fast', function() {
              $(this).remove();
            });
          } else {
            // We're deleting a snippet from its view page. Redirect to the 
            // list page.
            document.location.href = "/my"
          }
        }
      }, 'json');
    }
    return false;
  });
});
#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import os.path

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import snipglobals

class LogoutHandler(webapp.RequestHandler):
  
  def get(self):
    user = users.get_current_user()
    template_values = {
      # TODO(battlehorse): create logout url based on current request url  
      'logout_url': users.create_logout_url('/'),
    }
    snipglobals.delete_cookie('xsrf_token', self.response)
    snipglobals.delete_cookie('ACSID', self.response,
                              '.%s' % snipglobals.get_domain())
    path = os.path.join(os.path.dirname(__file__), '../../templates/logout.html')
    self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
  [('/logout', LogoutHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
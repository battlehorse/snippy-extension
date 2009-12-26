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


class TestHandler(webapp.RequestHandler):

  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)        
    path = os.path.join(os.path.dirname(__file__), '../templates/test.html')
    self.response.out.write(template.render(path, template_values))    


application = webapp.WSGIApplication([('/test', TestHandler)],
                                     debug=True)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

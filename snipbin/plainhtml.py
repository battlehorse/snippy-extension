#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import os.path

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import snipglobals

class BaseHandler(webapp.RequestHandler):
  
  def render_page(self, html_page):
    user, template_values = snipglobals.get_user_capabilities(self.request,
                                                              self.response)      
    path = os.path.join(os.path.dirname(__file__), 'templates/%s' % html_page)
    self.response.out.write(template.render(path, template_values))


class AboutHandler(BaseHandler):
  
  def get(self):
    self.render_page('about.html')


class LegalHandler(BaseHandler):
  
  def get(self):
    self.render_page('legal.html')

    
class ExtensionHandler(BaseHandler):

  def get(self):
    self.render_page('extension.html')
    

class ExtensionWelcomeHandler(BaseHandler):
  
  def get(self):
    self.render_page('extension_welcome.html')

class ExtensionLoginHandler(BaseHandler):

  def get(self):
    self.render_page('extension_login.html')


application = webapp.WSGIApplication(
  [('/about', AboutHandler), 
   ('/legal', LegalHandler),
   ('/extension', ExtensionHandler),
   ('/extwelcome', ExtensionWelcomeHandler),
   ('/extlogin', ExtensionLoginHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
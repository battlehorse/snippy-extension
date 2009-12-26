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

class BaseHandler(webapp.RequestHandler):
  
  def render_page(self, html_page, title, fliplinks=None):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)      
    template_values['title'] = title
    if fliplinks is None:
      template_values['fliplinks'] = ['public']
    else:
      template_values['fliplinks'] = fliplinks
    path = os.path.join(os.path.dirname(__file__), '../../templates/%s' % html_page)
    self.response.out.write(template.render(path, template_values))


class AboutHandler(BaseHandler):
  
  def get(self):
    self.render_page('about.html', title='What is SnipBin?')


class LegalHandler(BaseHandler):
  
  def get(self):
    self.render_page('legal.html', title='Terms and Conditions of Usage')
    

class CreditsHandler(BaseHandler):
  
  def get(self):
    self.render_page('credits.html', title='Credits')

    
class ExtensionHandler(BaseHandler):

  def get(self):
    self.render_page('extension.html', title='Chrome Extension')
    

class ExtensionWelcomeHandler(BaseHandler):
  
  def get(self):
    self.render_page('extension_welcome.html', 
                     title='Welcome to SnipBin',
                     fliplinks=[])

class ExtensionLoginHandler(BaseHandler):

  def get(self):
    self.render_page('extension_login.html',
                     title='Welcome to SnipBin',
                     fliplinks=['login', 'my'])
    
application = webapp.WSGIApplication(
  [('/about', AboutHandler), 
   ('/legal', LegalHandler),
   ('/credits', CreditsHandler),
   ('/extension', ExtensionHandler),
   ('/extwelcome', ExtensionWelcomeHandler),
   ('/extlogin', ExtensionLoginHandler),
  ],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
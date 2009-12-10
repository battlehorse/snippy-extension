#!/usr/bin/env python

import os.path

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import snipglobals

class BaseHandler(webapp.RequestHandler):
  
  def render_page(self, html_page):
    template_values = {}
    user = users.get_current_user()
    template_values['logged_in'] = user
    if user:
      template_values['logout_url'] = users.create_logout_url('/')
      
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


application = webapp.WSGIApplication(
  [('/about', AboutHandler), 
   ('/legal', LegalHandler),
   ('/extension', ExtensionHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
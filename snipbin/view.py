#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import hashlib
import os.path
import random

from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import snipglobals
import models
import vo

class BaseViewHandler(webapp.RequestHandler):
  
  def get_snippage(self, user, template_values):
    key = self.request.get('key')
    if not key:
      template_values['error'] = 'Invalid snippet key.'
      self.respond(template_values)
      return None, None
    
    snippage = None
    try:  
      snippage = db.get(key)
    except db.BadKeyError:
      template_values['error'] = 'Invalid snippet key.'
      self.respond(template_values)
      return None, None
      
    if not snippage.public:
      if not user or snippage.owner != user:
        template_values['error'] = 'You do not have the righs to access this snippet.'
        self.respond(template_values)
        return None, None
        
    if snippage.public and snippage.flagged:
      if not user or snippage.owner != user:
        template_values['error'] = 'This page has been flagged as offensive and removed from public view.'
        self.respond(template_values)
        return None, None
    
    return snippage, key
    
  def respond(self, template_values):
    path = os.path.join(os.path.dirname(__file__), 'templates/view.html')
    self.response.out.write(template.render(path, template_values))


class ViewHandler(BaseViewHandler):
  
  def increment_views(self, key):
    snippage = db.get(key)
    snippage.views += 1
    snippage.put()
  
  def get(self):
    user, template_values = snipglobals.get_user_capabilities(self.request,
                                                              self.response)
    snippage, key = self.get_snippage(user, template_values)
    if not snippage:
      return
    template_values['is_owner'] = user and user == snippage.owner
    
    db.run_in_transaction(self.increment_views, key)
    template_values.update({
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
    })    
    path = os.path.join(os.path.dirname(__file__), 'templates/view.html')
    self.response.out.write(template.render(path, template_values))


class IncludeHandler(BaseViewHandler):
  
  def get(self):
    user, template_values = snipglobals.get_user_capabilities(
        self.request, self.response, generate_xsrf=False)
    snippage, key = self.get_snippage(user, template_values)
    if not snippage:
      return
      
    template_values.update({
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
    })
    path = os.path.join(os.path.dirname(__file__), 'templates/iframe.html')
    self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
  [('/view', ViewHandler), ('/inc', IncludeHandler)],
  debug=snipglobals.debug)

webapp.template.register_template_library('customfilters')

def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

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
  
  def get_snippage(self, template_values):
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
      user = users.get_current_user()
      if not user or snippage.owner != user:
        template_values['error'] = 'You do not have the righs to access this snippet.'
        self.respond(template_values)
        return None, None
        
    if snippage.public and snippage.flagged:
      user = users.get_current_user()
      if not user or snippage.owner != user:
        template_values['error'] = 'This page has been flagged as offensive and removed from public view.'
        self.respond(template_values)
        return None, None
    
    return snippage, key


class ViewHandler(BaseViewHandler):
  
  def increment_views(self, key):
    snippage = db.get(key)
    snippage.views += 1
    snippage.put()

  def respond(self, template_values):
    path = os.path.join(os.path.dirname(__file__), 'templates/view.html')
    self.response.out.write(template.render(path, template_values))
  
  def get(self):
    template_values = {}
    snippage, key = self.get_snippage(template_values)
    if not snippage:
      return
      
    user = users.get_current_user();
    if user:
      xsrf_token = hashlib.md5('%s-%s' % (user.user_id(), random.random())).hexdigest()
      self.response.headers.add_header('Set-Cookie', 'xsrf_token=%s' % xsrf_token)
      template_values['is_owner'] = user == snippage.owner
      template_values['xsrf_token'] = xsrf_token
    else:
      template_values['is_owner'] = False
      template_values['xsrf_token'] = None
    
    db.run_in_transaction(self.increment_views, key)
    template_values.update({
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
      'logged_in' : users.get_current_user(),
    })
    
    if users.get_current_user():
      template_values['logout_url'] = users.create_logout_url('/')
    
    path = os.path.join(os.path.dirname(__file__), 'templates/view.html')
    self.response.out.write(template.render(path, template_values))


class IncludeHandler(BaseViewHandler):
  
  def get(self):
    template_values = {}
    snippage, key = self.get_snippage(template_values)
    if not snippage:
      return
      
    template_values = {
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
    }
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

#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import logging
import os
import os.path

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py.handlers import handlers
from py import snipglobals
from py import models
from py import vo

class BaseViewHandler(handlers.ErrorHandler):
  
  def get_snippage(self, user, template_values):
    key = self.request.get('key')
    if not key:
      self.handle_user_error('The snippet key you provided is not valid.',
                             {'key': key})
      return None, None
    
    snippage = None
    try:  
      snippage = db.get(key)
    except db.BadKeyError:
      self.handle_user_error('The snippet key you provided is not valid.',
                             {'key': key})
      return None, None
      
    if users.is_current_user_admin():
      # Admins have access to private snippets
      logging.info('Admin access by %s to snippet %s' % (user, key))
      return snippage, key
    
    if not snippage.public:
      if not user or snippage.owner != user:
        self.handle_user_error(
            'You do not have the rights to access this snippet.',
            {'key': key, 'user': user})
        return None, None
        
    if snippage.public and snippage.flagged:
      if not user or snippage.owner != user:
        self.handle_user_error(
            'This page has been flagged as offensive and removed from public view.',
            {'key': key})
        return None, None
    
    return snippage, key


class ViewHandler(BaseViewHandler):
  
  def increment_views(self, key):
    snippage = db.get(key)
    snippage.views += 1
    snippage.put()
  
  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)
    snippage, key = self.get_snippage(user, template_values)
    if not snippage:
      return
    template_values['is_owner'] = user and user == snippage.owner
    
    http_host = os.environ['HTTP_HOST']
    if http_host == 'localhost:8080':  # this is needed for local development.
      inc_host = http_host
    else:
      inc_host = 'hosted.%s' % http_host
    
    if not users.is_current_user_admin():
      db.run_in_transaction(self.increment_views, key)
      snippage.views += 1
    elif user == snippage.owner:  # admin, but looking at its own pages.
      db.run_in_transaction(self.increment_views, key)
      snippage.views += 1
    
    template_values.update({
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
      'inc_host': inc_host,

      'title_img': '/view_icon.png',
      'title': snippage.title,
      'fliplinks': ['my', 'public'],
    })    
    path = os.path.join(os.path.dirname(__file__), '../../templates/view.html')
    self.response.out.write(template.render(path, template_values))


class HelperHandler(BaseViewHandler):
  
  def get(self):
    path = os.path.join(os.path.dirname(__file__), '../../templates/helper.html')
    self.response.out.write(template.render(path, {}))


class IncludeHandler(BaseViewHandler):
  
  def get(self):
    self.set_error_template_file('../../templates/iframe.html')
    user, template_values = snipglobals.initialize_user(
        self.request, self.response, generate_xsrf=False)
    snippage, key = self.get_snippage(user, template_values)
    if not snippage:
      return
      
    template_values.update({
      'error': False,
      'snippage': vo.SnipPageVO(snippage),
      'parent_host': os.environ['HTTP_HOST'].replace('hosted.', '', 1)
    })
    path = os.path.join(os.path.dirname(__file__), '../../templates/iframe.html')
    self.response.out.write(template.render(path, template_values))


# Serving the snippets iframe from a subdomain, to minimize XSS attacks.
# The pair of domains used depends on the environment where the app is deployed:
# - production:
#   snipbin.appspot.com, hosted.snipbin.appspot.com
#
# - staging (non-live apps deployed on appengine):
#   <app_version>.latest.snipbin.appspot.com, hosted.<app-version>.latest.snipbin.appspot.com
#
# - development (local machine)
#   localhost:8080 for both domains.
if snipglobals.is_localhost():
  domain = snipglobals.get_domain()
  applications = {
    domain: webapp.WSGIApplication(
        [('/view', ViewHandler), ('/inc', IncludeHandler), ('/helper', HelperHandler)],
        debug=snipglobals.debug),
  }
else:
  domain = snipglobals.get_domain()
  hosted_domain = snipglobals.get_hosted_domain()
  applications = {
    domain: webapp.WSGIApplication(
        [('/view', ViewHandler), ('/helper', HelperHandler)],
        debug=snipglobals.debug),
    hosted_domain: webapp.WSGIApplication(
        [('/inc', IncludeHandler)],
        debug=snipglobals.debug),
  }


def main():
  run_wsgi_app(applications[os.environ['HTTP_HOST']])


if __name__ == '__main__':
  main()

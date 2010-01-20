#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import os.path

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py.handlers import handlers
from py import models
from py import snipglobals


class PublicHandler(handlers.BaseListHandler):
  
  def get_public_snippets(self, order="-views", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('public =', True)
    q.filter('flagged =', False)
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)
    order, offset, limit = self.get_pagination('-views')    
    snippages, more, more_offset = self.get_public_snippets(
      order, offset, limit)
    
    template_values.update({
      'snippages': snippages,
      'prev': offset > 0,
      'prev_offset': max(offset - limit, 0),
      'more': more,
      'more_offset': more_offset,
      'limit': limit,
      'order': order,
      
      'title_img': '/public_icon_small.png',
      'title': 'Public Snippets',
      'fliplinks': ['my', 'login'],
    })    
    path = os.path.join(os.path.dirname(__file__), '../../templates/public.html')
    self.response.out.write(template.render(path, template_values))


class PrivateHandler(handlers.BaseListHandler):

  def get_private_snippets(self, order="-created", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('owner =', users.get_current_user())
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)
    if not user:
      self.redirect(users.create_login_url(self.request.uri))
      return
    
    order, offset, limit = self.get_pagination('-created')
    snippages, more, more_offset = self.get_private_snippets(
      order, offset, limit)
    
    template_values.update({
      'snippages': snippages,
      'prev': offset > 0,
      'prev_offset': max(offset - limit, 0),
      'more': more,
      'more_offset': more_offset,
      'limit': limit,
      'order': order,

      'title_img': '/my_icon_small.png',
      'title': 'Your Snippets',
      'fliplinks': ['public'],
    })
    path = os.path.join(os.path.dirname(__file__), '../../templates/my.html')
    self.response.out.write(template.render(path, template_values))    
    

application = webapp.WSGIApplication(
  [('/', PublicHandler), ('/my', PrivateHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

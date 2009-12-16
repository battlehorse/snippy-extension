#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import hashlib
import os.path
import random

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import snipglobals
import models
import vo


class BaseHandler(webapp.RequestHandler):
  
  def parse_order(self, order):
    # allowed ordering is : 'title', 'views', 'created'
    allowed_orders = set(['title', '-title', 'views', '-views',
                          'created', '-created'])
    if order in allowed_orders:
      return order
    else:
      return '-views'

  def parse_limit(self, limit):
    parsed_limit = 10
    try:
      parsed_limit = int(limit)
      parsed_limit = max(min(parsed_limit, 100), 1)
    except ValueError:
      pass
    except TypeError:
      pass
    return parsed_limit
    
  def parse_offset(self, offset):
    parsed_offset = 0
    try:
      parsed_offset = int(offset)
      parsed_offset = max(min(parsed_offset, 1000), 0)
    except ValueError:
      pass
    except TypeError:
      pass
    return parsed_offset
    
  def get_pagination(self, default_order):
    order = self.parse_order(self.request.get('order', default_value=default_order))
    offset = self.parse_offset(self.request.get('offset', default_value=0))
    limit = self.parse_limit(self.request.get('limit', default_value=10))
    return order, offset, limit
    
  def fetch_results(self, q, limit, offset):
    results = [vo.SnipPageVO(snippage) for snippage
      in q.fetch(limit=limit+1, offset=offset)]
    
    more = len(results) > limit
    if more:
      results = results[:limit]
    return results, more, offset + len(results)
    
class PublicHandler(BaseHandler):
  
  def get_public_snippets(self, order="-views", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('public =', True)
    q.filter('flagged =', False)
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user, template_values = snipglobals.get_user_capabilities(self.request,
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
      'pagination_uri': '/',
    })    
    path = os.path.join(os.path.dirname(__file__), 'templates/public.html')
    self.response.out.write(template.render(path, template_values))


class PrivateHandler(BaseHandler):

  def get_private_snippets(self, order="-created", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('owner =', users.get_current_user())
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user, template_values = snipglobals.get_user_capabilities(self.request,
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
      'pagination_uri': '/my',
    })
    path = os.path.join(os.path.dirname(__file__), 'templates/my.html')
    self.response.out.write(template.render(path, template_values))    
    

application = webapp.WSGIApplication(
  [('/', PublicHandler), ('/my', PrivateHandler)],
  debug=snipglobals.debug)
  
webapp.template.register_template_library('customfilters')


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

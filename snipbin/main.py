#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

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

#TODO(battlehorse): public listing by views desc
#TODO(battlehorse): pagination
#TODO(battlehorse): personal sorted alphabetically
#TODO(battlehorse): personal sorted by views desc

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
    order, offset, limit = self.get_pagination('-views')
    
    snippages, more, more_offset = self.get_public_snippets(
      order, offset, limit)
    
    template_values = {
      'snippages': snippages,
      'prev': offset > 0,
      'prev_offset': max(offset - limit, 0),
      'more': more,
      'more_offset': more_offset,
      'limit': limit,
      'order': order,
      'pagination_uri': '/',
    }
    
    path = os.path.join(os.path.dirname(__file__), 'templates/public.html')
    self.response.out.write(template.render(path, template_values))


class PrivateHandler(BaseHandler):

  def get_private_snippets(self, order="-created", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('owner =', users.get_current_user())
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user = users.get_current_user()
    if not user:
      self.redirect(users.create_login_url(self.request.uri))
      return

    xsrf_token = hashlib.md5('%s-%s' % (user.user_id(), random.random())).hexdigest()
    order, offset, limit = self.get_pagination('-created')
    
    snippages, more, more_offset = self.get_private_snippets(
      order, offset, limit)
    
    template_values = {
      'snippages': snippages,
      'prev': offset > 0,
      'prev_offset': max(offset - limit, 0),
      'more': more,
      'more_offset': more_offset,
      'limit': limit,
      'order': order,
      'pagination_uri': '/my',
      'logout_url': users.create_logout_url('/'),
      'is_admin': users.is_current_user_admin(),
      'xsrf_token': xsrf_token,
    }
  
    path = os.path.join(os.path.dirname(__file__), 'templates/my.html')
    self.response.headers.add_header('Set-Cookie', 'xsrf_token=%s' % xsrf_token)
    self.response.out.write(template.render(path, template_values))    
    

application = webapp.WSGIApplication(
  [('/', PublicHandler), ('/my', PrivateHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

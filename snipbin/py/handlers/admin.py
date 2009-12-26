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


class UserHandler(handlers.BaseListHandler):
  
  def get_user_snippets(self, email, order="-created", offset=0, limit=10):
    q = models.SnipPage.all()
    q.filter('owner =', users.User(email))
    q.order(order)
    return self.fetch_results(q, limit, offset)

  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)
    assert users.is_current_user_admin()
    email = self.request.get('email')
    if not email:
      template_values.update({
        'snippages': None,
        'title': 'Inspect Snippets'
      })
    else:
      order, offset, limit = self.get_pagination('-created')
      snippages, more, more_offset = self.get_user_snippets(
        email, order, offset, limit)    
      template_values.update({
        'snippages': snippages,
        'prev': offset > 0,
        'prev_offset': max(offset - limit, 0),
        'more': more,
        'more_offset': more_offset,
        'limit': limit,
        'order': order,
        'extra_params': '&email=%s' % email,

        'title': '%s\'s Snippets' % email,
      })
    template_values.update({
      'fliplinks': ['public', 'my'],
      'email': email,
    })
    path = os.path.join(os.path.dirname(__file__), '../../templates/user.html')
    self.response.out.write(template.render(path, template_values))


application = webapp.WSGIApplication(
  [('/admin/user', UserHandler)],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
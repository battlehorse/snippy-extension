#!/usr/bin/env python

import hashlib
import os.path
import random

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


class TestHandler(webapp.RequestHandler):

  def get(self):
    user = users.get_current_user()
    xsrf_token = hashlib.md5('%s-%s' % (user.user_id(), random.random())).hexdigest()
    
    template_values = {
      'xsrf_token': xsrf_token,
      'logout_url': users.create_logout_url('/'),
    }
    
    path = os.path.join(os.path.dirname(__file__), '../templates/test.html')
    self.response.headers.add_header('Set-Cookie', 'xsrf_token=%s' % xsrf_token)
    self.response.out.write(template.render(path, template_values))    


application = webapp.WSGIApplication([('/test', TestHandler)],
                                     debug=True)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

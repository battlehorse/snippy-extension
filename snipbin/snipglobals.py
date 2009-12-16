#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import hashlib
import random

from google.appengine.api import users

debug=True

def get_user_capabilities(request, response, generate_xsrf=True):
  template_values = {}
  user = users.get_current_user()
  if user:
    if generate_xsrf:
      xsrf_token = hashlib.md5('%s-%s' % (user.user_id(), random.random())).hexdigest()
      response.headers.add_header('Set-Cookie', 'xsrf_token=%s' % xsrf_token)      
    else:
      xsrf_token = None
    
    # TODO(battlehorse): create logout url based on current request url
    logout_url = users.create_logout_url('/')
  else:
    xsrf_token = None
    logout_url = None
    
  template_values = {
    'logged_in' : user,
    'xsrf_token': xsrf_token,
    'is_admin': users.is_current_user_admin(),
    'logout_url': logout_url,
  }
  return user, template_values
  
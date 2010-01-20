#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import hashlib
import os
import random
import re

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

from py import autoretry

debug=False
autoretry.autoretry_datastore_timeouts()
template.register_template_library('py.customfilters')
template.register_template_library('py.customtags')

def initialize_user(request, response, generate_xsrf=True, propagate_cookies=True):
  if propagate_cookies and not is_subdomain():
    cookies_to_subdomain(['ACSID'], request, response)
  
  template_values = {}
  user = users.get_current_user()
  if user:
    if generate_xsrf:
      xsrf_token = hashlib.md5('%s-%s' % (user.user_id(), random.random())).hexdigest()
      response.headers.add_header('Set-Cookie', 'xsrf_token=%s; path=/; HttpOnly' % xsrf_token)      
    else:
      xsrf_token = None    
  else:
    xsrf_token = None
    
  template_values = {
    'logged_in' : user,
    'xsrf_token': xsrf_token,
    'is_admin': users.is_current_user_admin(),
    'app_version_id': os.environ['CURRENT_VERSION_ID'],
  }
  return user, template_values
  
def get_domain():
  return os.environ['HTTP_HOST']
  
def get_hosted_domain():
  domain = get_domain()
  if re.match('localhost', domain):
    return domain
  else:
    return 'hosted.%s' % domain
    
def is_localhost():
  return re.match('localhost', get_domain())
  
def is_subdomain():
  # automatically excludes localhost, where the master domain and the 'hosted'
  # subdomain are collapsed on the same host.
  return re.match('hosted', get_domain())
  
def cookies_to_subdomain(cookies, request, response):
  for cookie_name in cookies:
    cookie_value = request.cookies.get(cookie_name)
    if cookie_value:
      response.headers.add_header(
        'Set-Cookie', '%s=%s; domain=.%s; HttpOnly' % 
        (cookie_name, cookie_value, get_domain()))

def delete_cookie(cookie_name, response, domain=None):
  if domain:
    response.headers.add_header(
        'Set-Cookie',
        '%s=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=%s; HttpOnly' %
        (cookie_name, get_domain()))
  else:
    response.headers.add_header(
        'Set-Cookie', '%s=;expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly' % 
        cookie_name)

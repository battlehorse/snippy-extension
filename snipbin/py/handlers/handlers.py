#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import logging
import os
import os.path

from google.appengine.api import datastore_errors
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

from py import snipglobals
from py import vo

class ErrorHandler(webapp.RequestHandler):
  
  def __init__(self):
    super(ErrorHandler, self).__init__()
    self._error_template_file = '../../templates/error.html'
    
  def set_error_template_file(self, error_template_file):
    self._error_template_file = error_template_file
  
  def handle_user_error(self, user_message, context=None):
    """Handles 'expected' errors, such as invalid parameters from the user."""
    logging.error('User error: %s, context: %s' % (user_message, context))
    self._respond_with_error(user_message)
  
  def handle_exception(self, exception, debug_mode):
    """Handles unexpected exceptions, such as datastore timeouts."""
    if debug_mode:
      super(ErrorHandler, self).handle_exception(exception, debug_mode)
    else:
      logging.exception('Exception: %s' % exception)
      if isinstance(exception, datastore_errors.Timeout):
        # Custom message for datastore timeouts
        self._respond_with_error('This operation is taking longer than usual. '
                                 'Please try again in a few seconds.')
      else:
        self._respond_with_error('An unexpected error occurred. '
                                 'Please try again in a few seconds.')

  def _respond_with_error(self, user_message):
    _, template_values = snipglobals.initialize_user(
      self.request, self.response, generate_xsrf=False, propagate_cookies=False)
    template_values.update({
      'error': user_message,
      'title': 'Error!',
    })
    path = os.path.join(os.path.dirname(__file__), self._error_template_file)
    self.response.out.write(template.render(path, template_values))


class BaseListHandler(ErrorHandler):
  
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
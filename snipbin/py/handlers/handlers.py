#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import webapp

import vo

class BaseListHandler(webapp.RequestHandler):
  
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
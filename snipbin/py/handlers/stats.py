#!/usr/bin/env python
# Copyright (c) 2010 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import os.path

from google.appengine.ext import webapp
from google.appengine.ext.db import stats
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

from py import snipglobals

class StatsHandler(webapp.RequestHandler):
  
  def get(self):
    user, template_values = snipglobals.initialize_user(self.request,
                                                        self.response)
    global_stat = None
    for s in stats.GlobalStat.all().fetch(1000):
      if global_stat is None or global_stat.timestamp < s.timestamp:
        globat_stat = s
    if global_stat is not None:
      cur_ts = global_stat.timestamp
    
      kinds = [
        kind for kind in 
        stats.KindStat.all().filter('timestamp = ', cur_ts).fetch(1000)
      ]
    
      kind_names = [
        kind_name for kind_name in
        stats.KindPropertyNameStat.all().filter('timestamp = ', cur_ts).fetch(1000)
      ]
    
      template_values.update({
        'global_stat': global_stat,
        'kinds': kinds,
        'kind_names': kind_names,
      })
    
    template_values['title'] = 'Stats'
    path = os.path.join(os.path.dirname(__file__), '../../templates/stats.html')
    self.response.out.write(template.render(path, template_values))

application = webapp.WSGIApplication(
  [('/stats', StatsHandler),],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

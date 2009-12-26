#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import webapp
 
register = webapp.template.create_template_register()
 
def naturalTimeDifference(value):
    """
    Finds the difference between the datetime value given and now()
    and returns appropriate humanize form
    """
 
    from datetime import datetime
 
    if isinstance(value, datetime):
        delta = datetime.now() - value
        if delta.days > 6:
            return value.strftime("%b %d")                    # May 15
        if delta.days > 1:
            return value.strftime("%A")                       # Wednesday
        elif delta.days == 1:
            return 'yesterday'                                # yesterday
        elif delta.seconds > 3600:
            if delta.seconds < 7200:
              return '1 hour ago'
            else:
              return str(delta.seconds / 3600 ) + ' hours ago'  # 3 hours ago
        elif delta.seconds >  60:
            if delta.seconds < 120:
              return '1 minute ago'
            else:
              return str(delta.seconds/60) + ' minutes ago'     # 29 minutes ago
        elif delta.seconds > 10:
            return str(delta.seconds) + ' seconds ago'          # 15 seconds ago
        else:
            return 'a moment ago'                             # a moment ago
        return defaultfilters.date(value)
    else:
        return str(value)
        
register.filter(naturalTimeDifference)
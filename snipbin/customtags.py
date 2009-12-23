#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import webapp

register = webapp.template.create_template_register()

def show_title(context):
  return {'imgsrc': context.get('title_img'), 'title': context['title'] }
  
def show_fliplinks(context):
  fliplinks = dict(('fliplink_%s' % fliplink, True) for fliplink in context.get('fliplinks', set()))
  if fliplinks:
    fliplinks['fliplinks'] = True
  fliplinks['logged_in'] = context['logged_in']
  return fliplinks

register.inclusion_tag('tags/show_title.inc.html', takes_context=True)(show_title)
register.inclusion_tag('tags/show_fliplinks.inc.html', takes_context=True)(show_fliplinks)

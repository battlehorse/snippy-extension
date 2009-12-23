#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import webapp

register = webapp.template.create_template_register()

def show_title(context):
  return {'imgsrc': context.get('title_img'), 'title': context['title'] }

register.inclusion_tag('tags/show_title.inc.html', takes_context=True)(show_title)
#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import webapp


def show_title(context):
  return {'imgsrc': context.get('title_img'), 'title': context['title'] }

  
def show_fliplinks(context):
  fliplinks = dict(('fliplink_%s' % fliplink, True) for fliplink in context.get('fliplinks', set()))
  if fliplinks:
    fliplinks['fliplinks'] = True
  fliplinks['logged_in'] = context.get('logged_in')
  fliplinks['is_admin'] = context.get('is_admin')
  return fliplinks

  
def show_snippage(snippage, capabilities):
  template_values = {
    'snippage': snippage,
  }
  template_values.update(
    (capability, True) for capability in capabilities.split('|'))
  return template_values


def show_abuses(snippage):
  return {'snippage': snippage}


register = webapp.template.create_template_register()
register.inclusion_tag('tags/show_title.inc.html', takes_context=True)(show_title)
register.inclusion_tag('tags/show_fliplinks.inc.html', takes_context=True)(show_fliplinks)
register.inclusion_tag('tags/show_snippage.inc.html')(show_snippage)
register.inclusion_tag('tags/show_abuses.inc.html')(show_abuses)

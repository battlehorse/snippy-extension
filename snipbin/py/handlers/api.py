#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

import base64
import datetime
import logging
import re

from django.utils import simplejson
from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.runtime import apiproxy_errors

from lib.BeautifulSoup import BeautifulSoup
from py import models
from py import snipglobals

#TODO(battlehorse): should save SnipPage + Snippets in a transaction?
#TODO(battlehorse): string properties to be trimmed at 500 chars

class ApiBase(webapp.RequestHandler):
  
  def respond(self, json_dict):
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(simplejson.dumps(json_dict))
    
  def check_xsrf_token(self, payload):
    xsrf_from_payload = payload.get('xsrf_token');
    xsrf_from_cookies = self.request.cookies.get('xsrf_token')
    if xsrf_from_payload != xsrf_from_cookies:
      self.respond_error('invalid_xsrf_token')
      return False
    return True
  
  def check_user_login(self):
    user = users.get_current_user()
    if not user:
      self.respond_error('not_logged_in')
    return user
    
  def check_payload(self, variable_name='payload'):
    payload = self.request.get(variable_name)
    if not payload:
      self.respond_error('no_payload')
      return
      
    try:
      payload = simplejson.loads(self.request.get('payload', ''))
    except ValueError:
      self.respond_error('invalid_json')
      return
    return payload
    
  def respond_error(self, error_key):
    self.respond({'status': error_key})
    
  def respond_ok(self, extra_info=None):
    resp = {'status': 'ok'}
    if extra_info:
      resp.update(extra_info)
    self.respond(resp)
    
  def handle_exception(self, exception, debug_mode):
    logging.exception('API Exception: %s' % exception)
    self.response.clear();
    if isinstance(exception, apiproxy_errors.RequestTooLargeError):
      self.respond_error('request_too_large')
    else:
      self.respond_error('server_error')

class Upload(ApiBase):
  
  def sanitize_contents(self, contents):
    soup = BeautifulSoup(contents)
    for tagname in ['script', 'meta', 'head', 'link']:
      [tag.extract() for tag in soup.findAll(tagname)]
    
    attr_re = re.compile('^on.*', re.I)
    for tag in soup.findAll():
      for attr, _ in tag.attrs:
        if attr_re.match(attr):
          del tag[attr]
    for tag in soup.findAll(attrs={'href': re.compile(r'^\s*javascript:.*', re.I)}):
      del tag['href']
    for tag in soup.findAll(attrs={'src': re.compile(r'^\s*javascript:.*', re.I)}):
      del tag['src']
      
    sanitized_contents = soup.renderContents()
    return sanitized_contents
    
  def sanitize_url(self, url):
    javascript_re = re.compile('javascript:.*', re.I)
    if javascript_re.match(url.strip()):
      return ''
    return url
    
  def store_snippage(self, owner, snippage_title, snippets):
    snippage = models.SnipPage(owner=owner, views=0, public=False, 
                               flagged=False, title=snippage_title)
    snippage.put()
    
    for snippet_contents in snippets:
      snippet = models.Snippet(parent=snippage,
                               content=snippet_contents['content'])
      if snippet_contents['url']:
        snippet.url = snippet_contents['url']
      if snippet_contents['comment']:
        snippet.comment = snippet_contents['comment']
      snippet.master = snippage
      snippet.put()
    return str(snippage.key())
  
  def post(self):
    user = self.check_user_login()
    if not user:
      return
      
    payload = self.check_payload()
    if not payload:
      return
    
    json_snippets = payload.get('snippets', [])
    if not json_snippets:
      self.respond_error('no_snippets')
      return
      
    # b64_screenshot = payload.get('screenshot')
    # if b64_screenshot:
    #   snippage.screenshot = base64.b64decode(b64_screenshot)

    title = (payload.get('title') or 
            '%s %s' % (user.nickname(), datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    snippage_title = title.encode('utf-8', 'ignore').decode('utf-8', 'ignore')
    snippets = []
    for json_snippet in json_snippets:
      content = self.sanitize_contents(json_snippet.get('content', '').encode('utf-8', 'ignore'))
      url = self.sanitize_url(json_snippet.get('url', '').encode('utf-8', 'ignore'))
      if url:
        url = url.decode('utf-8', 'ignore')
      comment = json_snippet.get('comment', '').encode('utf-8', 'ignore')
      if comment:
        comment = comment.decode('utf-8', 'ignore')

      snippets.append({
        'content': content.decode('utf-8', 'ignore'),
        'url': url,
        'comment': comment,
      })
    new_key = db.run_in_transaction(self.store_snippage, user, snippage_title, snippets)
    self.respond_ok({'key': new_key})


class Login(ApiBase):
  
  def get(self):
    if not self.check_user_login():
      return
    self.respond_ok()


class TogglePublic(ApiBase):
  
  def post(self):
    user = self.check_user_login()
    if not user:
      return
      
    payload = self.check_payload()
    if not payload:
      return
      
    if not self.check_xsrf_token(payload):
      return
    
    key = payload.get('key')
    if not key:
      self.respond_error('no_key')
      return
    
    public = payload.get('public')
    if 'public' not in payload:  # need this style because 'public' is a bool.
      self.respond_error('no_public')
      return
    
    snippage = None
    try:
      snippage = db.get(key)
    except db.BadKeyError:
      self.respond_error('invalid_key')
      return
    
    if snippage.owner != user and not users.is_current_user_admin():
      self.respond_error('no_auth')
      return
      
    if public:  # 'public' could be a truthy/falsy value instead of directly True or False
      snippage.public = True
    else:
      snippage.public = False
    snippage.put()
    self.respond_ok()


class ReportAbuse(ApiBase):

  def post(self):
    user = self.check_user_login()
    if not user:
      return
      
    payload = self.check_payload()
    if not payload:
      return
      
    if not self.check_xsrf_token(payload):
      return
    
    key = payload.get('key')
    if not key:
      self.respond_error('no_key')
      return
    
    report = payload.get('report')
    if not report:
      self.respond_error('no_report')
      return
    
    snippage = None
    try:
      snippage = db.get(key)
    except db.BadKeyError:
      self.respond_error('invalid_key')
      return
    
    abuse = models.AbuseReport(message=report, reporter=user)
    abuse.master = snippage
    abuse.put()

    self.respond_ok({'key': str(snippage.key())})


class Delete(ApiBase):

  def post(self):
    user = self.check_user_login()
    if not user:
      return
      
    payload = self.check_payload()
    if not payload:
      return
    
    if not self.check_xsrf_token(payload):
      return

    key = payload.get('key')
    if not key:
      self.respond_error('no_key')
      return
      
    snippage = None
    try:
      snippage = db.get(key)
    except db.BadKeyError:
      self.respond_error('invalid_key')
      return
    
    if snippage.owner != user and not users.is_current_user_admin():
      self.respond_error('no_auth')
      return
    
    for snippet in snippage.snippets:
      snippet.delete()
      
    for abuse in snippage.abuses:
      abuse.delete()
      
    snippage.delete()
    self.respond_ok()


application = webapp.WSGIApplication(
  [('/api/upload', Upload),  # no xsrf-token check
   ('/api/loginstatus', Login),  # no xsrf-token check
   ('/api/togglepublic', TogglePublic),
   ('/api/delete', Delete),
   ('/api/reportabuse', ReportAbuse),
  ],
  debug=snipglobals.debug)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()

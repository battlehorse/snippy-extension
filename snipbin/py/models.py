#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from google.appengine.ext import db

class SnipPage(db.Model):
  owner = db.UserProperty()
  title = db.StringProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  screenshot = db.BlobProperty()
  views = db.IntegerProperty()
  public = db.BooleanProperty()
  flagged = db.BooleanProperty()
  
  
class Snippet(db.Model):
  master = db.ReferenceProperty(SnipPage, collection_name='snippets')
  content = db.TextProperty()
  url = db.StringProperty()
  comment = db.StringProperty(multiline=True)
  

class AbuseReport(db.Model):
  master = db.ReferenceProperty(SnipPage, collection_name='abuses')
  message =  db.StringProperty(multiline=True)
  reporter = db.UserProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  resolved = db.DateTimeProperty()
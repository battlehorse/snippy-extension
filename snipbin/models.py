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
  comment = db.StringProperty()
  

class AbuseReport(db.Model):
  master = db.ReferenceProperty(SnipPage, collection_name='abuses')
  message =  db.StringProperty()
  reporter = db.UserProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  resolved = db.DateTimeProperty()
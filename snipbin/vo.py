import models

class SnipPageVO(object):
  
  def __init__(self, snippage):
    self.m = snippage
    self.views_including_this = snippage.views + 1
    self.key = snippage.key()
    self.snippets_count = snippage.snippets.count()
    self.abuses_count = snippage.abuses.count()
    self.unique_snippet_urls = set(filter(None, [snippet.url for snippet in snippage.snippets]))
      
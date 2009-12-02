import models

class SnipPageVO(object):
  
  def __init__(self, snippage):
    self.m = snippage
    self.key = snippage.key()
    self.snippets_count = snippage.snippets.count()
    self.abuses_count = snippage.abuses.count()
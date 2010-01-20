#!/usr/bin/env python
# Copyright (c) 2009 Riccardo Govoni. All rights reserved.
# Use of this source code is governed by the MIT License and Creative Commons
# Attribution License 3.0. Both of them can be found in the LICENSE file.

from py import models

class SnipPageVO(object):
  
  def __init__(self, snippage):
    self.m = snippage
    self.key = snippage.key()
    self.snippets_count = snippage.snippets.count()
    self.abuses_count = snippage.abuses.count()
    self.unique_snippet_urls = set(filter(None, [snippet.url for snippet in snippage.snippets]))
      
---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
author: "Zakaria Laabsi"
tags: []
categories: []
description: ""
summary: ""
ShowToc: true
TocOpen: true
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

## Introduction

Write your introduction here.

---

## Section

Content here.

---

## References

[^1]: Author et al. "Paper Title." *Conference/Journal*, Year. [Link]()

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "{{ replace .File.ContentBaseName "-" " " | title }}." *zlaabsi.github.io*, {{ dateFormat "Jan 2006" .Date }}.

```bibtex
@article{laabsi{{ dateFormat "2006" .Date }}{{ lower (index (split .File.ContentBaseName "-") 0) }},
  title   = "{{ replace .File.ContentBaseName "-" " " | title }}",
  author  = "Laabsi, Zakaria",
  journal = "zlaabsi.github.io",
  year    = "{{ dateFormat "2006" .Date }}",
  month   = "{{ dateFormat "Jan" .Date }}",
  url     = "https://zlaabsi.github.io/posts/{{ .File.ContentBaseName }}/"
}
```

</details>

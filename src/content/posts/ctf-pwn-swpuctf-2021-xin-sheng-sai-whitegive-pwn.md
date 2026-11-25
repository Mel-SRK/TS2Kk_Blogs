---
title: '[SWPUCTF 2021 新生赛]whitegive_pwn'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- whitegive_pwn
---

## 思路

做这道题已经明显感受到自己的进步了。这道题涉及动态链接以及程序与 C 库之间的关系。复盘时可以先确认库版本，再区分主程序和共享库各自承担的工作。

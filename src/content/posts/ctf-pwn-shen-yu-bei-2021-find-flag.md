---
title: '[深育杯 2021]find_flag'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- find_flag
---

## 思路

题目启用了 PIE 和 Canary 保护。PIE 让程序可以装载到不同基址，Canary 则用来检测部分栈写越界造成的破坏。

这题把两种保护和一个格式字符串问题放在了一起。复盘时可以把防护机制与缺陷分开分析，先确认输出函数是否使用固定格式模板，再看各项保护分别约束哪一类错误。

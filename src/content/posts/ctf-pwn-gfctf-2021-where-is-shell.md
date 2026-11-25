---
title: '[GFCTF 2021]where_is_shell'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- where_is_shell
---

## 思路

原笔记沿着几个函数之间的调用关系，追踪输入最终由哪个栈对象接收。看到按字节处理的数据时，可以同时记录对象容量、调用方传下来的长度和接收方对长度的假设。

## exp

边界检查应放在真正处理输入的位置。即使调用方已经检查了长度，接收函数也要按自身对象的容量执行检查，避免未来新增调用路径时漏掉约束。

---
title: '[HNCTF 2022 Week1]ret2shellcode'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- ret2shellcode
---

## 思路

这道题同时涉及缓冲区边界与内存执行权限。原笔记通过反汇编检查函数如何接收输入，并记录了相应内存区域的权限。分析这两点时，要分别核对数据能写到哪里，以及代码和数据区域分别被授予了什么权限。

## exp

修复时可以把这两个问题分开验证。输入处理按缓冲区容量检查长度，构建与加载设置则确保可写的输入区域保持不可执行。

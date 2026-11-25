---
title: '[SWPUCTF 2022 新生赛]shellcode？'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- shellcode？
---

## 思路

这是最初用于理解内存页权限的一道练习。读、写、执行是不同的权限。查看内存映射时，可以按页标注程序存放了什么数据，以及程序需要对这些页进行哪些操作。

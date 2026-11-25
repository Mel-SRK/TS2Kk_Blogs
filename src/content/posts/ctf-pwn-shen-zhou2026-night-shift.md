---
title: 神舟2026 night_shift Writeup
description: 赣网杯 的 PWN 解题笔记。
pubDate: '2026-10-31'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- 赣网杯
---

## night_shift

2026 赣网杯线上预选赛 Pwn，100 分。题目是 64 位 ELF，启用了 Canary 和 NX。

### 思路

程序的输入和输出路径有两个不同的边界问题。输出要将输入视为普通数据，读取则应当按目标缓冲区的实际容量限制长度。

### 关键点

- Canary 能帮助发现部分栈破坏，NX 用于限制从数据页执行代码。
- 阅读汇编时，调用约定和栈对齐也值得单独记录。有些崩溃来自调用边界上的假设不成立。
- 在修复时应分别检查输入长度和输出格式，避免只确认一个分支的处理方式。

### 相关

- [神舟2026-anneal](../ctf-pwn-shen-zhou2026-anneal/)
- Canary保护原理

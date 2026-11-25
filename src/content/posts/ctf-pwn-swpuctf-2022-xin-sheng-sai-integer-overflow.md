---
title: '[SWPUCTF 2022 新生赛]Integer Overflow'
description: 从 SWPUCTF 的 Integer Overflow 题看无符号输入解析和长度校验。
pubDate: '2026-10-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- Integer Overflow
---

## 思路

这道题的关键在于，输入的数字既要按程序约定的格式解析，也要落在允许的长度范围内。

### 信息收集

先用 `checksec` 查看目标程序的保护配置。

<img src="../../images/write-ups/swpuctf-2022-integer-overflow-checksec.png" alt="Integer Overflow 题目二进制的 checksec 检查结果" width="1254" height="203" loading="lazy" decoding="async">

### 漏洞点

`scanf` 的 `%u` 将结果写入无符号整数，但它匹配的数字文本可以带正负号。如果程序把 `%u` 当成长度校验，就会漏掉格式和取值范围的边界情况。

如果长度的输入格式只允许十进制数字，可以先检查整段文本是否符合格式，再确认解析成功、数值可表示且不超过目标缓冲区容量。后续读入或复制时使用同一个已经校验过的长度。

### 相关

- 栈
- ROP
- 常见保护

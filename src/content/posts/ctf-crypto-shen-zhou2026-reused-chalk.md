---
title: 神舟2026 reused_chalk Writeup
description: 赣网杯 的 Crypto 解题笔记。
pubDate: '2026-10-31'
category: Write-ups
tags:
- CTF
- Crypto
- Writeup
- 赣网杯
---

## reused_chalk

这道题考查 Schnorr 签名中的临时随机数复用。不同消息的签名出现了相同的承诺值，这是两次签名可能复用了同一个随机数的线索。

### 思路

先把签名记录按承诺值整理，找出对应不同消息的重复值，再回到签名过程分析这种重复怎样破坏签名间应有的独立性。

### 验证

这类问题适合用重复性测试和签名验证交叉检查。实际系统可以依赖经审查的签名库，并核查随机数生成、实现细节和密钥使用记录。

---
title: '[HDCTF 2023]pwnner'
description: NSS 的 PWN 解题笔记。
pubDate: '2026-01-01'
category: Write-ups
tags:
- CTF
- PWN
- Writeup
- NSS
aliases:
- pwnner
---

## 思路

伪随机数是这道题的核心。同一个伪随机算法在相同初始条件下会生成相同的序列，所以种子的来源直接关系到输出是否可以被预测。

## Exp

审查时先弄清随机数的用途。如果输出承担身份验证或其他安全职责，应由系统提供的密码学安全随机源生成。对纯展示数据或可重复的测试，确定性序列则便于重现结果。

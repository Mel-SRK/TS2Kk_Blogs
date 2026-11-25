---
title: 神舟2026 epitaph Writeup
description: 还原一道字节码虚拟机逆向题的指令和校验逻辑，用模拟对拍与约束求解验证推导。
pubDate: '2026-10-31'
category: Write-ups
tags:
- CTF
- Reverse
- Writeup
- 赣网杯
featured: true
---

## epitaph

2026 赣网杯线上预选赛 Reverse，300 分。stripped ELF64，`.text` 只有 0x179d，`.rodata` 却有 0x6df60，题目把逻辑塞进了数据段。

### 思路

输入格式在 `0x40134b..0x401385` 校验：`fgets` 最多 0x50 字节，去掉换行后长度必须 0x2a 也就是 42，开头 `flag{`、结尾 `}`。中间 36 个字符按 UUID 形状解析，`-` 必须落在下标 8、13、18、23，其余 32 个十六进制字符转成 16 字节，也就是 128 个输入位。

程序启动时有反调试检查。输入校验的主体是一段字节码虚拟机。

真正的校验是一个字节码虚拟机：

- `calloc` 出 0xdb79 字节，`buf[1] = 1`，`buf[2..129]` 放 128 个输入位（每个字节按 LSB 优先摊开）。
- 程序在 `0x4036c8`，共 0xdaf7 条指令，每条 8 字节。
- 状态寄存器 `r9 = 0x1715609f7c746c69`，每步加 `0x78dde6e5fd29f054`。
- 每条指令的四个字段分别和四路掩码异或解码，掩码来自 `A = 0xec5f36b37fb8d345` 与 `r9`、`r9+0x9e3779b97f4a7c15`、`r9+0x3c6ef372fe94f82a`、`r9+0xdaa66d2c7ddf743f` 的组合，再过一遍 xorshift32。
- 字段还要过 `idx(x) = ((x + 0x64c) & 0xffff) * 0xb42b & 0xffff`。
- 四个 opcode：`0x75d5` 异或、`0x34b2` 与、`0xf38f` 非、`0xb26c` 复制。
- 成功条件是 `buf[0xda88] == 1`。

### 解题过程

先写纯 Python 版虚拟机，和 Unicorn 模拟真实机器码对拍：全零输入下两边输出的 56185 字节缓冲区逐字节相同，`buf[0xda88]` 都是 0。

然后把电路转成 Tseitin CNF 交给 Z3，每个门一个 Bool，规模约 5.6 万个变量，直接断言目标位为真：

```
decoded t=0.2
built t=2.2
res sat t=13.3
HEX e3566e4673b9458b8cbd2fec043d8ef6
FLAG flag{e3566e46-73b9-458b-8cbd-2fec043d8ef6}
verify True end None bufT 1
```

上一轮的解法是把 0xdaf7 个门拼成一个嵌套 Z3 表达式，规模平方级增长，跑到超时。改成逐门建变量就十几秒出结果。

### 关键点

- 用独立的虚拟机模型对照机器码模拟，可以验证对指令语义的理解。
- 掩码里的常量抄错一位就全盘解不出，建议先用 Unicorn 跑前几十步对拍指令流。
- 求解脚本（`vm.py`、`cnf.py`）当时写在临时沙箱里，没保留下来，这篇只记录模型和常量。

### flag

```
flag{e3566e46-73b9-458b-8cbd-2fec043d8ef6}
```

### 相关

- [神舟2026-rev1](../ctf-reverse-shen-zhou2026-rev1/)
- [神舟2026-rev2](../ctf-reverse-shen-zhou2026-rev2/)

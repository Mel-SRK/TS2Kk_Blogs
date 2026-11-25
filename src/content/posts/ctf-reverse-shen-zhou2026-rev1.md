---
title: 神舟2026 rev1 Writeup
description: 赣网杯 的 Reverse 解题笔记。
pubDate: '2026-10-31'
category: Write-ups
tags:
- CTF
- Reverse
- Writeup
- 赣网杯
---

## rev1

2026 赣网杯线上预选赛 Reverse，100 分。附件是一个 7 KB 的 PE32，用 wine 跑起来会要求输入 flag。

### 思路

`0x401150` 是主函数。`scanf("%63s")` 读到 `[ebp-0x44]`，长度必须 16，然后按 8 字节一块送进 `0x401000`，结果和 `.rdata:0x4020f4` 起的 16 字节比对，相等就打印 `Your flag is right!`。

`0x401000` 是 TEA，但被展开过了：外层循环 8 次，每次做 8 个 half-round，`sum` 依次加 δ、2δ、3δ、4δ，外层结束再 `sum += 4δ`，合起来 32 个 cycle。常数 δ 是 `0x9e3779b9`，密钥是 `[0x01234567, 0x89abcdef, 0xfedcba98, 0x76543210]`。

上一轮解错在把循环当成 8 个 cycle，解出来全是不可打印字符。后来用 Unicorn 实际执行 `0x401000` 对拍，才数清每个外层是 8 个 half-round，改成 32 cycle 后随机 20 组输入全部一致。

目标密文在文件偏移 0x10f4：`8bdae4ef ac08b65e 23de5385 1a77675e`。

### 关键点

- 每个 8 字节块按大端拆成两个 32 位字解密，结果按小端写回，字节序搞反会得到一串看着像乱码的 ASCII。
- 二进制只认 16 字节内层值，`flag{}` 是平台要求的包装。内层在 wine 里实跑确认过。

### exp

```python
import struct

CT = bytes.fromhex('8bdae4efac08b65e23de53851a77675e')
K = [0x01234567, 0x89abcdef, 0xfedcba98, 0x76543210]
DELTA, MASK = 0x9e3779b9, 0xffffffff


def dec(v0, v1, rounds=32):
    s = (DELTA * rounds) & MASK
    for _ in range(rounds):
        v1 = (v1 - ((((v0 << 4) & MASK) + K[2]) ^ ((v0 + s) & MASK) ^ (((v0 >> 5) + K[3]) & MASK))) & MASK
        v0 = (v0 - ((((v1 << 4) & MASK) + K[0]) ^ ((v1 + s) & MASK) ^ (((v1 >> 5) + K[1]) & MASK))) & MASK
        s = (s - DELTA) & MASK
    return v0, v1


out = b''
for i in range(0, 16, 8):
    v0, v1 = struct.unpack('>II', CT[i:i + 8])
    a, b = dec(v0, v1)
    out += struct.pack('<II', a, b)
print(out.decode())
```

输出 `oac6dabo3cdac95b`。

### flag

```
flag{oac6dabo3cdac95b}
```

### 相关

- [神舟2026-rev2](../ctf-reverse-shen-zhou2026-rev2/)
- [神舟2026-reused_chalk](../ctf-crypto-shen-zhou2026-reused-chalk/)

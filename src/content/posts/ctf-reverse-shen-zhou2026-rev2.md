---
title: 神舟2026 rev2 Writeup
description: 赣网杯 的 Reverse 解题笔记。
pubDate: '2026-10-31'
category: Write-ups
tags:
- CTF
- Reverse
- Writeup
- 赣网杯
---

## rev2

2026 赣网杯线上预选赛 Reverse，200 分。PE32，节表被改得乱七八糟（节名 `TJA!`，入口 `0x408b70`）。

### 思路

`strings` 能看到 `input your flag:`、` is wrong!`、`Congratulations,you found it!!!`，还有一段像密钥的字符串 `gvab9f21ckzyqx9d6d2q5ujip8ddkbdr`。

解包后的镜像在 `0x401000` 先执行 `mov BYTE PTR ds:0x40301f,0x6c`，把密钥第 7 个字节从 `'1'` 改成 `'l'`。所以运行时密钥是 `gvab9f2lckzyqx9d6d2q5ujip8ddkbdr`。

校验在 `0x401104..0x4011bc`，对输入按对处理，`j = 0,2,...,30`，`i = j+1`：

```
b[j] = b[j] + b[i]  (mod 256)
b[i] = b[i] ^ b[j]  (用新的 b[j])
```

然后每个字节异或密钥，最后按 8 个小端 dword 和 `0xC1FAD4A4, 0xC9F496A8, 0xD8E99AF6, 0xC5AC8CE4, 0x87A59FAF, 0xC7F12656, 0x320A95BB, 0x2E0D370D` 比较。

反推的时候先把目标异或密钥，再按 `b[i] = t[i] ^ t[j]`、`b[j] = t[j] - b[i]` 还原每一对。

### exp

```python
import struct

key = bytearray(b'gvab9f21ckzyqx9d6d2q5ujip8ddkbdr')
key[7] = ord('l')                      # 0x401000 在运行时打的补丁
KEY = bytes(key)

T = [0xC1FAD4A4, 0xC9F496A8, 0xD8E99AF6, 0xC5AC8CE4,
     0x87A59FAF, 0xC7F12656, 0x320A95BB, 0x2E0D370D]

out = b''.join(struct.pack('<I', t) for t in T)
t = bytes(x ^ KEY[i] for i, x in enumerate(out))

p = bytearray(32)
for j in range(0, 32, 2):
    i = j + 1
    p[i] = t[i] ^ t[j]
    p[j] = (t[j] - p[i]) & 0xff

print(bytes(p).decode())
```

输出 `bac80acc1da24aa47b6a30f5ef683345`，在 wine 里实跑打印 `Congratulations,you found it!!!`。

### 关键点

- 密钥的第 7 位必须在运行时改，静态读到的 `'1'` 是错的。
- 旧 wineprefix 坏过（`userdef.reg is not a valid registry file`），新建前缀（`WINEPREFIX=$PWD/wp2 wineboot -u`）才能跑。
- 二进制只校验 32 个字符，`flag{}` 是平台包装。

### flag

```
flag{bac80acc1da24aa47b6a30f5ef683345}
```

### 相关

- [神舟2026-rev1](../ctf-reverse-shen-zhou2026-rev1/)
- UPX脱壳

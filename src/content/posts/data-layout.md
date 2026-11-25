---
title: "数据布局"
description: "以 x86-64 Linux 为例，记录 C 类型的大小与对齐、结构体填充和聚合类型传参。"
pubDate: "2026-10-19"
category: "技术"
tags: ["C", "ABI", "Linux"]
---

ABI 管两件事，一是函数边界上的数据怎么交接，二是数据在内存里摆成什么样。后者就是这篇。

栈上的局部对象、堆上 `malloc` 出来的对象和全局对象，同一类型的内部布局遵守同一套规则。算成员偏移、读结构体都靠它，`sizeof` 不一定等于各成员大小之和。

## 类型大小与对齐

x86-64 Linux 实测，大小和对齐均以字节为单位。

| 类型 | 大小 | 对齐 |
| --- | --- | --- |
| char | 1 | 1 |
| short | 2 | 2 |
| int | 4 | 4 |
| long / long long / 指针 | 8 | 8 |
| float | 4 | 4 |
| double | 8 | 8 |
| long double | 16 | 16 |

普通结构体有三条摆放规则。

1. 每个成员的偏移是自身对齐值的倍数，不够就在前面补 padding。
2. 结构体整体大小向上取整到最大成员对齐值的倍数，末尾补 padding。
3. 嵌套结构体先算完内层，内层整体再作为一个成员参与外层的对齐。

## padding 实例

```c
struct Note { char name[16]; int id; char *content; int size; };
struct Bad  { char c; long l; int i; };
```

```text
struct Note  sizeof=40   name=0  id=16  content=24  size=32
struct Bad   sizeof=24   c=0     l=8    i=16
```

`Note` 里 `id` 占 16 到 19，`content` 要求 8 字节对齐，所以 20 到 23 补 4 字节空位。`size` 在 32，末尾再补 4 字节凑到 40。

`Bad` 里 `c` 占 0，`l` 要求 8 字节对齐，1 到 7 补 7 字节。`i` 在 16，末尾补 4 字节到 24。

算偏移要按实际布局。尤其是字符数组后面跟一个 `int` 这种组合，可以分别用 `sizeof` 和 `offsetof` 核对结构体大小和成员偏移。

## 按值传结构体与 eightbyte 分类

System V AMD64 ABI 以 8 字节为单位对对象分类。对下面这些只包含普通整数、指针和浮点数的例子，INTEGER 类用通用寄存器传，SSE 类用向量寄存器传。同一个对象可以同时用两类寄存器。若寄存器不够，或者对象划为 MEMORY 类，则按内存传参。

```text
struct DD { double a, b; }      -> xmm0、xmm1
struct LD { long a; double b; } -> rdi、xmm0
struct C4 { char a, b, c, d; }  -> edi
struct { long a, b; }           -> 返回值占 rax、rdx
```

以 MEMORY 类的 `struct P { long a, b, c; }` 为例，返回值和参数走两条不同的路。

- **当返回值**。主调函数留好结果空间，把地址作为隐式参数放入 `rdi`，原本的第一个整数参数顺延到 `rsi`。
- **当参数**。主调函数把整个对象拷到栈参数区。如果 `struct P` 后面还有一个 `long` 参数，它仍然可以使用 `rdi`。

## union、位域、packed、字节序

```c
union Mix { char c; long l; double d; char s[20]; };
union Nest { struct { long l; int i; } s; double d; char buf[9]; };
struct Bits { unsigned a:1; unsigned b:3; unsigned c:12; unsigned d:20; };
struct __attribute__((packed)) Pk { char c; long l; int i; };
```

`union` 的大小至少能容纳最大成员，也需要满足整体对齐要求。`Mix` 里最大成员是 20 字节的数组，对齐值为 8，所以整体占 24 字节。`Nest` 最大成员是 16 字节的结构体，所以整体占 16 字节。

位域的具体分配与编译器和 ABI 有关。`Bits` 的四个字段共 36 位，在这个例子里占 8 字节。

`packed` 将成员紧密排列，`Pk` 由普通布局的 24 字节变为 13 字节，成员偏移分别为 0、1 和 9。成员可能落在不对齐的地址上，访问的代价与处理器架构有关。

x86 使用小端字节序，多字节整数在内存里低位字节在前。`0x41424344` 在内存里按地址从低到高读是 `44 43 42 41`。

## 相关

- [ELF文件结构](../elf-file-structure/)讲的是代码和数据怎样放在目标文件里。

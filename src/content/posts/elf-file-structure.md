---
title: "ELF文件结构"
description: "记录 Linux ELF 的文件头、节和段，以及编译、链接和加载时各部分的用途。"
pubDate: "2026-01-01"
category: "技术"
tags: ["ELF", "ABI", "Linux"]
---

ELF 是可执行与可链接格式（Executable and Linkable Format）。代码、数据和各种表按一定规则放在一起。`/usr/include/elf.h` 定义了 ELF 文件头、程序头和节区头等结构。

Linux 上常见的 ELF 文件有三种。

- **可重定位文件**（Relocatable File）。包含编译器生成的代码和数据，通常使用 `.o` 后缀。链接器将它与其他目标文件或库一起链接。
- **可执行文件**（Executable File）。由系统加载和运行。
- **共享目标文件**（Shared Object File）。包含可以被多个程序使用的代码和数据，通常使用 `.so` 后缀。动态链接器把程序和所需的共享库组合成进程映像。

## 可执行文件编译过程

1. **预处理**。展开头文件和宏，处理条件编译。可以用 `gcc -E test.c -o test.i` 查看结果。
2. **编译**。把 C 代码编译为汇编代码，命令是 `gcc -S test.i -o test.s`。
3. **汇编**。把汇编代码转换为目标文件，命令是 `gcc -c test.s -o test.o`。
4. **链接**。处理目标文件之间的引用和需要的库，命令是 `gcc test.o -o test`。可以用 `-static` 请求静态链接，前提是已经安装所需的静态库。

## ELF 结构布局

ELF 的主要组成部分是文件头、程序头表、节区和节区头表。

| 部分 | 用途 |
| --- | --- |
| 文件头（ELF Header） | 记录文件类型、目标机器架构、入口地址及其他表的位置。 |
| 程序头表（Program Header Table） | 描述段如何映射到内存，包括偏移、地址、大小和权限。 |
| 节区（Section） | 按用途存放内容。例如 `.text` 存放代码，`.data` 存放已有初值的数据，`.rodata` 存放只读数据。 |
| 节区头表（Section Header Table） | 为各节记录名称、类型、文件偏移和大小等信息。 |

节是链接视图，供链接器组织代码和数据。段是执行视图，供加载器创建进程映像。一个可加载段可以包含多个节。

## 加载原理

系统先读 ELF 文件头，确认文件格式和目标架构，再按程序头表中的记录把可加载段映射到进程的虚拟地址空间。程序头还可以通过 `PT_INTERP` 指定解释器。对于通常的动态链接程序，解释器是动态链接器，它负责加载依赖和重定位，然后把控制权交给程序入口。

通常 C 程序里的 `main` 在运行时完成初始化之后才会被调用。ELF 文件头的入口地址常指向启动代码 `_start`。

## 文件头与节区头

下面以 32 位 ELF 文件头为例。

```c
#define EI_NIDENT 16

typedef struct {
    unsigned char e_ident[EI_NIDENT];
    Elf32_Half    e_type;
    Elf32_Half    e_machine;
    Elf32_Word    e_version;
    Elf32_Addr    e_entry;
    Elf32_Off     e_phoff;
    Elf32_Off     e_shoff;
    Elf32_Word    e_flags;
    Elf32_Half    e_ehsize;
    Elf32_Half    e_phentsize;
    Elf32_Half    e_phnum;
    Elf32_Half    e_shentsize;
    Elf32_Half    e_shnum;
    Elf32_Half    e_shstrndx;
} Elf32_Ehdr;
```

`e_type` 是文件类型，`e_machine` 是目标架构，`e_entry` 是入口的虚拟地址。`e_phoff` 和 `e_shoff` 分别给出程序头表和节区头表在文件中的偏移。两张表的表项大小和数量也在文件头部。

`e_ident` 的开头是 ELF 标识字节，之后的字段用于确定如何读其余内容。

| 宏 | 下标 | 用途 |
| --- | --- | --- |
| `EI_MAG0` 至 `EI_MAG3` | 0–3 | 文件标识 |
| `EI_CLASS` | 4 | ELF32 或 ELF64 |
| `EI_DATA` | 5 | 数据编码和字节序 |
| `EI_VERSION` | 6 | 文件版本 |
| `EI_OSABI` | 7 | 操作系统或 ABI 标识 |
| `EI_ABIVERSION` | 8 | ABI 版本 |
| `EI_PAD` | 9 | 填充字节起点 |

节区头中的 `sh_name` 是节名在字符串表中的偏移。`e_shstrndx` 给出那个字符串表在节区头表里的索引。节区头还包含 `sh_type`、`sh_flags`、`sh_offset` 和 `sh_size` 等字段，用来描述节的类型、属性及在文件中的位置和大小。

## 程序链接原理

### 静态链接

静态链接在生成最终文件时处理各目标文件之间的引用，把所需的库代码和数据合并进输出文件。符号表保存函数和全局变量的定义及引用信息，链接器据此找到每个引用对应的定义。

### 动态链接

动态链接在文件中保留动态符号、重定位信息和共享库依赖。`DT_NEEDED` 项记录程序或共享库依赖的其他共享对象。运行时由动态链接器加载依赖，并解析对外部函数与变量的引用。

GOT 是全局偏移表，PLT 是过程链接表。在使用 PLT 的外部函数调用中，PLT 的代码通过 GOT 里的地址跳转。采用延迟绑定时，动态链接器可以等到函数第一次被调用时再解析该符号，后续调用使用已解析的地址。

## 常见的节

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `.text` | `SHT_PROGBITS` | 机器指令 |
| `.rodata` | `SHT_PROGBITS` | 只读数据 |
| `.data` | `SHT_PROGBITS` | 有初值、读写的数据 |
| `.bss` | `SHT_NOBITS` | 在进程映像中初始化为零的数据。节本身在文件中不占用对应的数据字节 |
| `.dynamic` | `SHT_DYNAMIC` | 动态链接信息 |
| `.dynsym` | `SHT_DYNSYM` | 动态链接用的符号表 |
| `.dynstr` | `SHT_STRTAB` | 动态链接用的字符串表 |
| `.rel.*`、`.rela.*` | `SHT_REL`、`SHT_RELA` | 重定位信息 |
| `.symtab` | `SHT_SYMTAB` | 符号表 |
| `.strtab` | `SHT_STRTAB` | 符号表使用的字符串 |
| `.shstrtab` | `SHT_STRTAB` | 节名字符串表 |
| `.note` | `SHT_NOTE` | 按约定格式记录附加信息 |

## 查看 ELF 文件的工具

- `file` 查看文件的大致类型。
- `readelf -h` 查看文件头，`readelf -l` 查看程序头表，`readelf -S` 查看节区头表。
- `nm` 查看符号。
- `objdump -h` 查看各节的概要，`objdump -s` 以十六进制显示节的内容，`objdump -d` 查看反汇编。

## 相关

- [数据布局](../data-layout/)记录 C 类型和聚合对象在内存中的布局。
- [程序的输入输出](../program-input-output/)也介绍了文件和内存映射相关的 `mmap()`。

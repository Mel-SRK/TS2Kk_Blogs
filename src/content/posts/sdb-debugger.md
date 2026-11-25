---
title: SDB 调试器开发笔记
description: '用 C 开发一个 x86_64 Linux 调试器的笔记，记录子进程跟踪、单步、软件断点、命令循环和 CMake 构建。'
pubDate: '2026-01-01'
category: 技术
tags: [开发, C, 调试器, ptrace, SDB]
---

## 1. 原理

### ptrace

Linux 下实现调试器主要依赖 `ptrace` 系统调用，用来让父进程观察和控制子进程的执行、寄存器与内存：

```c
#include <sys/ptrace.h>

long ptrace(enum __ptrace_request request, pid_t pid,
            void *addr, void *data);
```

常用请求：

| 请求 | 作用 |
| --- | --- |
| `PTRACE_TRACEME` | 子进程声明接受父进程跟踪 |
| `PTRACE_PEEKTEXT` | 读取子进程指定地址的内存（按 word 返回） |
| `PTRACE_POKETEXT` | 写入子进程指定地址的内存 |
| `PTRACE_GETREGS` | 读取子进程通用寄存器 |
| `PTRACE_SETREGS` | 修改子进程通用寄存器 |
| `PTRACE_CONT` | 恢复子进程继续执行 |
| `PTRACE_SINGLESTEP` | 单步执行一条指令后再次暂停 |

### fork + exec + ptrace 流程

```
父进程 (调试器)                    子进程 (被调试程序)
     |                                  |
  fork() ─────────────────────────────> 子进程开始执行
     |                                  |
     |                            ptrace(TRACEME)
     |                                  |
     |                              execl(program)
     |                                  |
  wait(&status) <────────────── SIGTRAP (exec 成功后内核发送)
     |
  ptrace(CONT / SINGLESTEP / ...)
     |
  wait(&status) <────────────── 下一次停止信号
```

子进程在 `PTRACE_TRACEME` 之后调用 `execl`，只要替换镜像成功，内核会自动发送一次 `SIGTRAP`，让父进程在目标程序第一条指令执行前接管控制权。

### 软件断点（INT3 / 0xCC）

x86_64 下软件断点利用单字节指令 `int3`（机器码 `0xCC`）：

```
原始指令:  55 48 89 E5 48 8D 05 C0 ...
写入 0xCC: CC 48 89 E5 48 8D 05 C0 ...
           ↑ 仅替换目标地址最低 1 字节
```

一次完整的断点命中与恢复流程：

1. 读出目标地址处的 8 字节指令备份，把最低字节改成 `0xCC` 写回。
2. CPU 执行到 `0xCC` 时触发 `SIGTRAP` 暂停，此时 `RIP` 停在 `断点地址 + 1`。
3. 调试器把 `RIP` 回退到断点地址，写回原始指令，再用 `PTRACE_SINGLESTEP` 走完这一条原指令。
4. 单步完成后，重新把 `0xCC` 写回断点地址（否则断点只生效一次），再 `PTRACE_CONT`。

## 2. 环境

断点注入依赖 x86 的 `int3` 指令（ARM 下机制不同，用的是 `BKPT`），下面代码只针对 x86_64 Linux：

```bash
uname -m   # 确认是 x86_64

sudo pacman -S readline          # Arch
sudo apt install libreadline-dev # Debian / Ubuntu
```

## 3. 最小跟踪框架

用 `fork` + `ptrace` 拉起目标程序，并结合 `wait` 状态宏和单步/继续控制子进程：

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <unistd.h>

void run_target(const char *program) {
    if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) < 0) {
        perror("ptrace TRACEME");
        exit(1);
    }
    execl(program, program, NULL);
    perror("execl");
    exit(1); // execl 失败必须退出，避免子进程继续跑父进程逻辑
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "用法: %s <程序路径>\n", argv[0]);
        return 1;
    }

    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        run_target(argv[1]);
    }

    int status;
    wait(&status); // 等待 execl 触发的初始 SIGTRAP
    printf("子进程 %d 已就绪\n", pid);

    // 示例：先单步一条，再放开全速执行
    ptrace(PTRACE_SINGLESTEP, pid, NULL, NULL);
    wait(&status);

    ptrace(PTRACE_CONT, pid, NULL, NULL);
    wait(&status);

    if (WIFEXITED(status)) {
        printf("子进程退出，状态码: %d\n", WEXITSTATUS(status));
    } else if (WIFSTOPPED(status)) {
        printf("子进程暂停，信号: %d\n", WSTOPSIG(status));
    }
    return 0;
}
```

每次通过 `ptrace` 让子进程恢复执行后，都需要再调用 `wait` 接住它的下一次状态变化（`WIFSTOPPED` / `WIFEXITED` 定义在 `<sys/wait.h>`）。

## 4. 断点注入与命中处理

```c
#include <errno.h>
#include <stdint.h>
#include <sys/user.h>

long set_breakpoint(pid_t pid, uintptr_t addr) {
    // PTRACE_PEEKTEXT 成功时也可能返回 -1（内存恰好为全 F），需结合 errno 判断
    errno = 0;
    long orig = ptrace(PTRACE_PEEKTEXT, pid, (void *)addr, NULL);
    if (orig == -1 && errno != 0) {
        perror("ptrace PEEKTEXT");
        return -1;
    }

    // 用 ~0xFFUL 清除最低字节，避免 32 位有符号掩码截断高位
    long trap = (orig & ~0xFFUL) | 0xCC;
    ptrace(PTRACE_POKETEXT, pid, (void *)addr, (void *)trap);
    return orig;
}
```

命中处理：

```c
struct user_regs_struct regs;
ptrace(PTRACE_GETREGS, pid, NULL, &regs);

if (WIFSTOPPED(status) && WSTOPSIG(status) == SIGTRAP && regs.rip == break_addr + 1) {
    printf("命中断点: 0x%llx\n", (unsigned long long)break_addr);

    // 1. 回退 RIP 并恢复原指令
    regs.rip = break_addr;
    ptrace(PTRACE_SETREGS, pid, NULL, &regs);
    ptrace(PTRACE_POKETEXT, pid, (void *)break_addr, (void *)orig_data);

    // 2. 单步越过原指令，再把断点写回去
    ptrace(PTRACE_SINGLESTEP, pid, NULL, NULL);
    wait(&status);
    set_breakpoint(pid, break_addr);
}
```

几点细节：
- `SIGTRAP` 不一定来自断点（比如 `PTRACE_SINGLESTEP` 完成同样会发 `SIGTRAP`），所以需要结合 `regs.rip == break_addr + 1` 判断是否真的踩中了断点。
- `PTRACE_PEEKTEXT` / `PTRACE_POKETEXT` 虽然按 `long`（8 字节）读写，但内核允许从任意字节偏移读取，而 x86_64 指令也是变长编码，所以断点地址不需要 8 字节对齐，只要确保设在某条指令的起始字节即可。

## 5. 交互循环与命令分发

输入部分用 GNU Readline 处理行编辑和历史记录：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <readline/readline.h>
#include <readline/history.h>

char *ui_read_command(void) {
    char *input;
    while (1) {
        input = readline("sdb > ");
        if (input == NULL) {
            return NULL; // Ctrl+D (EOF)
        }
        if (strlen(input) > 0) {
            add_history(input);
            return input; // readline 内部 malloc，由调用方 free
        }
        free(input); // 空行不入历史，避免按上键翻出一堆空白
    }
}
```

命令分发用函数指针表代替一长串 `if-else`：

```c
typedef void (*cmd_handler_t)(debugger_state_t *);

typedef struct {
    const char    *name;
    const char    *help;
    cmd_handler_t  handler;
} command_t;

static command_t commands[] = {
    {"s",    "单步执行", cmd_step},
    {"c",    "继续执行", cmd_continue},
    {"b",    "设置断点", cmd_break},
    {"i",    "列出断点", cmd_info},
    {"d",    "删除断点", cmd_delete},
    {"help", "显示帮助", cmd_help},
    {"q",    "退出",     cmd_quit},
    {NULL, NULL, NULL}
};
```

## 6. 模块划分与构建

拆成四个源文件后各司其职：

| 模块 | 职责 |
| --- | --- |
| `main.c` | `fork` 拉起目标进程、初始化状态、启动事件循环 |
| `ui.c` | `readline` 交互输入、命令查找与帮助输出 |
| `breakpoint.c` | 断点列表管理、`PTRACE_PEEKTEXT` / `PTRACE_POKETEXT` 读写 |
| `debugger.c` | 命令处理、`wait` 状态分发与断点恢复流程 |

公共头文件 `include/sdb.h`：

```c
#ifndef SDB_H
#define SDB_H

#include <stdint.h>
#include <sys/types.h>

#define MAX_BREAKPOINTS 64

typedef struct {
    int       id;
    uintptr_t addr;
    long      orig_data;
    int       enabled;
} breakpoint_t;

typedef struct debugger_state debugger_state_t;

struct debugger_state {
    pid_t        child_pid;
    breakpoint_t breakpoints[MAX_BREAKPOINTS];
    int          bp_count;
    int          running;
    int          step_count;
};

#endif
```

根目录 `CMakeLists.txt`：

```cmake
cmake_minimum_required(VERSION 3.16)
project(sdb VERSION 1.0.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra")

find_library(READLINE_LIB readline REQUIRED)

add_executable(sdb
    src/main.c
    src/ui.c
    src/breakpoint.c
    src/debugger.c
)
target_include_directories(sdb PRIVATE ${PROJECT_SOURCE_DIR}/include)
target_link_libraries(sdb PRIVATE ${READLINE_LIB})

# 测试用目标程序
add_executable(demo demo.c)
```

编译运行：

```bash
cmake -B build && cmake --build build
./build/sdb ./build/demo
```

## 7. 踩坑与注意点

### PIE 地址随机化

启用 PIE 时，二进制的加载基址可能随启动而变，直接填反汇编里的偏移会找不到指令：

```bash
file ./demo                     # 看是 pie executable 还是 executable
cat /proc/<pid>/maps            # 开启 PIE 时需要从 maps 里算实际加载基址
```

### Yama `ptrace_scope` 权限

如果后续要支持 attach 已有进程而非 `fork` 启动，注意内核的 `ptrace_scope` 限制：

```bash
cat /proc/sys/kernel/yama/ptrace_scope
# 0: 无限制
# 1: 只允许父进程 trace 子进程（常见默认值）
# 2: 仅 root
# 3: 禁用 ptrace
```

### 同一进程只能有一个 tracer

如果目标进程已经被 `gdb` 或其他调试器附加，再次 `PTRACE_TRACEME` 或 `PTRACE_ATTACH` 会直接失败。

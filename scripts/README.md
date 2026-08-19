# 内容构建流水线

按顺序执行：

1. `init_database.py` — 建库
2. `build_*.py` / `import_*.py` — 内容构建与导入
3. `pregen_*.py` — 预生成音频（可选）
4. `validate_content.py` — 校验
5. `build_app.bat` — 打包 exe

自检：`npm test`（依次跑 `selftest_*.mjs`）。

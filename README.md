# hang-la

一个基于 Electron 的“夯到拉”桌面排序工具。

## 功能

- 6 个横向栏位：
	- 自定义内容栏
	- 夯
	- 顶级
	- 人上人
	- NPC
	- 拉
- 支持新增、编辑、删除排序项
- 排序项支持文字图标或本地图片图标
- 支持拖拽到任意栏位并在栏位内重排
- 使用浏览器本地存储自动保存当前排序结果

## 启动

```bash
npm install
npm start
```

项目内已配置 Electron 二进制镜像，国内网络环境下安装会更稳定。

## 目录结构

```text
src/
	main.js
	preload.js
	renderer/
		app.js
		index.html
		styles.css
```
# SolarWar

## 部署方式

```shell
git clone https://github.com/BlueFisher/SolarWar.git
```
默认为 `master` 分支，如要切换到 `develop` 分支
```shell
git checkout origin/develop
```

安装npm依赖包

```shell
npm install
```

编译并运行

```shell
npm start
```

#### 开发

 直接编译并运行（带source map）

```shell
npm test
```

编译时监视文件改变并运行（需打开三个进程）

```shell
npm run watch-ts
npm run watch-webpack
node app
```

#### 使用 Visual Studio Code 开发

快捷键 `ctrl` + `shift` + `B` 或输入命令`>Tasks: Run Build Task` 启动监视TypeScript编译（需要进行配置）

监视webpack

```shell
npm run watch-webpack
```

启动网站

```shell
node app
```

## 开发环境

#### 环境

Node.js

#### 代码托管平台

GitHub - [https://github.com/BlueFisher/SolarWar](https://github.com/BlueFisher/SolarWar)

#### 编辑器

- Visual Studio Code
- Notepad++
- Typora

#### 语言

- TypeScript
- JavaScript

#### 工具

- Typings
- webpack


#### 开源项目

- body-parser
- ejs
- express
- express session
- log4js
- ws
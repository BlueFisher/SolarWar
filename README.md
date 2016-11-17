# SolarWar

一个用自己的飞船占领星球抢占资源的多人在线即时战略类游戏

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

安装typings（如省略则在编译TypeScript时会提示编译错误）

```shell
npm run buildTypings
```

配置 `/config.ts` 配置文件

编译并运行

```shell
npm start
```

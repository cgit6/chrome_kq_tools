import { copyFile, mkdir } from "fs/promises";
import { resolve } from "path";
import glob from "glob";
import path from "path";

const srcDir = "./public";
const destDir = "./dist";

async function copyFiles() {
  try {
    // 确保目标目录存在
    await mkdir("dist", { recursive: true });

    // 需要复制的文件列表
    const files = [
      ["public/manifest.json", "dist/manifest.json"],
      ["public/popup.html", "dist/popup.html"],
      ["public/icon16.png", "dist/icon16.png"],
      ["public/icon48.png", "dist/icon48.png"],
      ["public/icon128.png", "dist/icon128.png"],
      ["scripts/lazyLoadTrigger.js", "dist/lazyLoadTrigger.js"],
      ["public/background.js", "dist/background.js"],
      ["public/content.js", "dist/content.js"],
    ];

    // 复制所有文件
    await Promise.all(
      files.map(([src, dest]) => copyFile(resolve(src), resolve(dest)))
    );

    console.log("文件复制完成");
  } catch (error) {
    console.error("复制文件时出错:", error);
    process.exit(1);
  }
}

copyFiles();

// 如果dist目录中存在旧的content.js或direct-inject.js，删除它
const oldFiles = ["content.js"];
oldFiles.forEach((file) => {
  const filePath = resolve(destDir, file);
  if (
    copyFile(filePath, filePath)
      .then(() => {
        console.log(`Removed old file: ${file}`);
      })
      .catch((err) => {
        console.error(`Error removing ${file}:`, err);
      })
  );
});

// 确保assets目录存在
mkdir(resolve(destDir, "assets"), { recursive: true }).then(() => {
  // 处理CSS文件 - 重命名为固定名称
  try {
    // 查找所有CSS文件
    const cssFiles = glob.sync(resolve(destDir, "assets", "*.css"));
    console.log("找到以下CSS文件:");

    // CSS文件映射关系
    const cssMapping = {
      App: "App.css",
      ChatButton: "ChatButton.css",
      main: "main.css",
    };

    // 处理每个CSS文件
    cssFiles.forEach((file) => {
      const fileName = path.basename(file);
      console.log(` - 原始文件: ${fileName}`);

      // 检查文件是否需要重命名
      for (const [key, newName] of Object.entries(cssMapping)) {
        if (fileName.includes(key)) {
          const newPath = resolve(destDir, "assets", newName);
          copyFile(file, newPath)
            .then(() => {
              console.log(` - 重命名: ${fileName} -> ${newName}`);
            })
            .catch((error) => {
              console.error(` - 重命名失败: ${fileName}`, error);
            });
          break;
        }
      }
    });
  } catch (err) {
    console.error("处理CSS文件时出错:", err);
  }
});

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { uploadMarkdownFile } from "./zhihu/upload";
import { deleteArticle, updateArticle, createArticle } from "./zhihu/draft";
import { publishArticle } from "./zhihu/publish";

// 文章映射文件路径
const ARTICLE_MAP_FILE = "articlemap.json";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "zhihu-publisher-vscode.zhihuPublisher",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(
          "Please open a markdown file to publish"
        );
        return;
      }

      const document = editor.document;
      if (document.languageId !== "markdown") {
        vscode.window.showInformationMessage("Please open a markdown file");
        return;
      }

      try {
        const config = vscode.workspace.getConfiguration("zhihuPublisher");
        const cookie = config.get("cookie") as string;
        if (!cookie) {
          vscode.window.showErrorMessage(
            "Please set cookie in the settings first"
          );
          return;
        }

        const title = await vscode.window.showInputBox({
          placeHolder: "请输入文章标题",
          value: path.basename(document.fileName, ".md"),
        });

        if (!title) {
          vscode.window.showInformationMessage("Cancelled to publish");
          return;
        }

        const content = document.getText().replace( /(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (match, p1) => `$$${p1}$$`);
        const htmlContent = await uploadMarkdownFile(content, cookie);

        // 获取当前MD文件的绝对路径
        const mdFilePath = document.fileName;
        // 获取工作区根目录
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          document.uri
        );
        if (!workspaceFolder) {
          vscode.window.showErrorMessage("Cannot find workspace folder.");
          return;
        }

        // 读取文章映射文件
        const articleMapPath = path.join(
          workspaceFolder.uri.fsPath,
          ARTICLE_MAP_FILE
        );
        if (!fs.existsSync(articleMapPath)) {
          fs.mkdirSync(path.dirname(articleMapPath), { recursive: true });
          writeArticleMap(articleMapPath, {});
        }
        let articleMap = readArticleMap(articleMapPath);

        // 检查是否已存在映射
        const articleId = articleMap[mdFilePath];

        if (articleId) {
          (await updateArticle(articleId, title, htmlContent, cookie))
            ? (await publishArticle(articleId, cookie))
              ? vscode.window.showInformationMessage(
                  `Update successfully: [Click to view](https://zhuanlan.zhihu.com/p/${articleId})`
                )
              : vscode.window.showErrorMessage(`Update article failed`)
            : vscode.window.showErrorMessage(`Update article failed`);
        } else {
          const articleId = await createArticle(cookie);
          if (!articleId) {
            vscode.window.showErrorMessage(
              "Cannot create article, please check your cookie"
            );
            return;
          } else {
            (await updateArticle(articleId, title, htmlContent, cookie))
              ? (await publishArticle(articleId, cookie))
                ? vscode.window.showInformationMessage(
                    `Create successfully: [Click to view](https://zhuanlan.zhihu.com/p/${articleId})`
                  )
                : vscode.window.showErrorMessage("Create article failed")
              : vscode.window.showErrorMessage("Create article failed");
          }

          articleMap[mdFilePath] = articleId;
          writeArticleMap(articleMapPath, articleMap);
        }
      } catch (error: any) {
        console.error("Error during publishing:", error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// 读取文章映射文件
function readArticleMap(filePath: string): { [mdPath: string]: string } {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    vscode.window.showWarningMessage(`Cannot read article map file: ${error}`);
  }
  return {};
}

// 写入文章映射文件
function writeArticleMap(
  filePath: string,
  map: { [mdPath: string]: string }
): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(map, null, 2), "utf8");
  } catch (error) {
    vscode.window.showErrorMessage(`Cannot write article map file: ${error}`);
  }
}

export function deactivate() {}

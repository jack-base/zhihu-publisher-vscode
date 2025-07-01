import * as vscode from 'vscode';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as FormData from 'form-data';
import * as path from 'path';
import * as fs from 'fs';
import { convertMarkdownToZhihuHtml } from './md2zhihuhtml'; // 假设你有一个转换Markdown到知乎HTML的函数

// 文章映射文件路径
const ARTICLE_MAP_FILE = 'articlemap.json';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('zhihu-publisher-vscode.zhihuPublisher', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('请先打开一个Markdown文件');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'markdown') {
      vscode.window.showInformationMessage('请选择markdown格式的文件');
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('zhihuPublisher');
      const cookie = config.get('cookie') as string;
      if (!cookie) {
        vscode.window.showErrorMessage('请先在设置中配置知乎Cookie');
        return;
      }

      const title = await vscode.window.showInputBox({
        placeHolder: '请输入文章标题',
        value: path.basename(document.fileName, '.md')
      });

      if (!title) {
        vscode.window.showInformationMessage('发布已取消');
        return;
      }

      const content = document.getText();
      const htmlContent = await convertMarkdownToZhihuHtml(content);
      
      // 获取当前MD文件的绝对路径
      const mdFilePath = document.fileName;
      // 获取工作区根目录
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('无法确定工作区根目录');
        return;
      }
      
      // 读取文章映射文件
      const articleMapPath = path.join(workspaceFolder.uri.fsPath, ARTICLE_MAP_FILE);
      let articleMap = readArticleMap(articleMapPath);
      
      // 检查是否已存在映射
      const existingArticleUrl = articleMap[mdFilePath];
      
      let publishResult: boolean;
      let articleUrl: string | undefined;
      
      if (existingArticleUrl) {
        // 更新已存在的文章
        const articleId = extractArticleId(existingArticleUrl);
        if (articleId) {
          publishResult = await updateZhihuArticle(articleId, title, htmlContent, cookie);
          articleUrl = existingArticleUrl;
        } else {
          vscode.window.showWarningMessage('无法从URL中提取文章ID，将发布新文章');
          // 发布新文章
          const publishResponse = await publishToZhihu(title, htmlContent, cookie);
          publishResult = publishResponse.success;
          articleUrl = publishResponse.url;
        }
      } else {
        // 发布新文章
        const publishResponse = await publishToZhihu(title, htmlContent, cookie);
        publishResult = publishResponse.success;
        articleUrl = publishResponse.url;
      }
      
      if (publishResult && articleUrl) {
        // 更新文章映射
        articleMap[mdFilePath] = articleUrl;
        writeArticleMap(articleMapPath, articleMap);
        
        vscode.window.showInformationMessage(`文章已成功${existingArticleUrl ? '更新' : '发布'}到知乎: ${articleUrl}`);
      } else {
        vscode.window.showErrorMessage('文章发布失败');
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`发布过程中出现错误: ${error.message}`);
    }
  });

  context.subscriptions.push(disposable);
}

// 读取文章映射文件
function readArticleMap(filePath: string): { [mdPath: string]: string } {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    vscode.window.showWarningMessage(`读取文章映射文件失败: ${error}`);
  }
  return {};
}

// 写入文章映射文件
function writeArticleMap(filePath: string, map: { [mdPath: string]: string }): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(map, null, 2), 'utf8');
  } catch (error) {
    vscode.window.showErrorMessage(`保存文章映射文件失败: ${error}`);
  }
}

// 从文章URL中提取文章ID
function extractArticleId(url: string): string | null {
  const match = url.match(/zhuanlan\.zhihu\.com\/p\/(\d+)/);
  return match ? match[1] : null;
}

async function uploadImageToZhihu(imagePath: string): Promise<string> {
  // 实现图片上传到知乎的逻辑
  // 这里需要使用知乎的图片上传API
  // 简化示例，实际实现需要处理认证和API调用
  
  const config = vscode.workspace.getConfiguration('zhihuPublisher');
  const cookie = config.get('cookie') as string;
  
  const form = createFormData();
  form.append('image', fs.createReadStream(imagePath));

  const response = await axios.post(
    'https://www.zhihu.com/api/v4/answers/upload_image',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Cookie: cookie,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'multipart/form-data'
      },
      params: {
        type: 'answer'
      }
    }
  );

  if (response.data && response.data.url) {
    return response.data.url;
  }

  throw new Error('图片上传失败');
}

// 修改后的发布函数，返回包含URL的对象
async function publishToZhihu(title: string, content: string, cookie: string): Promise<{ success: boolean; url?: string }> {
  try {
    const response = await axios.post(
      'https://zhuanlan.zhihu.com/api/articles',
      {
        title: title,
        content: content,
        format: 'html',
        public_type: 'public',
        comment_permission: 'all'
      },
      {
        headers: {
          Cookie: cookie,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 201 && response.data.url) {
      return { success: true, url: response.data.url };
    }
    
    return { success: false };
  } catch (error) {
    console.error('发布文章出错:', error);
    return { success: false };
  }
}

// 新增：更新已存在的知乎文章
async function updateZhihuArticle(articleId: string, title: string, content: string, cookie: string): Promise<boolean> {
  try {
    const response = await axios.put(
      `https://zhuanlan.zhihu.com/api/articles/${articleId}`,
      {
        title: title,
        content: content,
        format: 'html',
        public_type: 'public',
        comment_permission: 'all'
      },
      {
        headers: {
          Cookie: cookie,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.status === 200;
  } catch (error) {
    console.error('更新文章出错:', error);
    return false;
  }
}

// 创建FormData实例的函数
function createFormData(): FormData {
  return new (FormData as any)();
}

export function deactivate() {}
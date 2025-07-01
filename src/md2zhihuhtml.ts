/**
 * Markdown 转知乎风格 HTML 解析器
 */
import * as fs from 'fs';


class ZhihuMarkdownParser {
  constructor() {}

  /**
   * 解析 Markdown 文本并返回知乎风格的 HTML
   */
  public parse(markdown: string): string {
    if (!markdown) {return '';}
    
    // 预处理：替换特殊字符
    markdown = this._preprocess(markdown);
    
    // 分块处理
    let blocks = markdown.split(/\n{2,}/g).filter(block => block.trim() !== '');
    
    // 解析每个块
    let html = '';
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      
      // 处理标题
      if (block.match(/^#{1,6}\s/)) {
        html += this._parseHeading(block);
        continue;
      }
      
      // 处理列表
      if (this._isList(block)) {
        html += this._parseList(block);
        continue;
      }
      
      // 处理引用
      if (block.startsWith('> ')) {
        html += this._parseBlockquote(block);
        continue;
      }
      
      // 处理代码块
      if (block.startsWith('```') || block.startsWith('~~~')) {
        html += this._parseCodeBlock(block);
        i += this._countCodeBlockLines(blocks, i);
        continue;
      }
      
      // 处理水平线
      if (block.match(/^---+|===+$/)) {
        html += '<hr />';
        continue;
      }
      
      // 处理表格
      if (this._isTable(block, blocks[i+1])) {
        const tableHtml = this._parseTable(block, blocks[i+1], blocks[i+2]);
        html += tableHtml;
        i += 2; // 跳过表格的其余行
        continue;
      }
      
      // 处理链接图片
      if (block.match(/^!\[.*\]\(.*\)$/)) {
        html += this._parseImage(block);
        continue;
      }

      // 处理本地图片
      if (block.match(/^!\[.*\]\(file:.*\)$/)) {
        const match = block.match(/!\[(.*?)\]\(file:(.*?)\)/);
        if (match) {
          const alt = match[1];
          const path = match[2];
          const base64Image = this._parseImageToBase64(path);
          html += `<img src="${base64Image}" alt="${alt}" />`;
        }
        continue;
      }
      
      // 处理段落
      html += this._parseParagraph(block);
    }
    
    return html;
  }
  
  /**
   * 预处理 Markdown 文本
   */
  private _preprocess(markdown: string): string {
    // 替换特殊字符
    markdown = markdown.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;');
    
    return markdown;
  }
  
  /**
   * 解析标题
   */
  private _parseHeading(block: string): string {
    const match = block.match(/^(#+)\s+(.*)$/);
    if (!match) return '';
    
    const level = match[1].length;
    const content = this._parseInline(match[2]);
    
    return `<h${level}>${content}</h${level}>`;
  }
  
  /**
   * 解析段落
   */
  private _parseParagraph(block: string): string {
    // 处理空行
    if (block.trim() === '') {
      return '<p><br></p>';
    }
    
    // 处理包含公式的行
    if (block.match(/\$\$.*\$\$/)) {
      return this._parseMathFormula(block);
    }
    
    // 处理普通段落
    const content = this._parseInline(block);
    return `<p>${content}</p>`;
  }
  
  /**
   * 解析行内元素
   */
  private _parseInline(text: string): string {
    // 解析粗体
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    text = text.replace(/__(.*?)__/g, '<b>$1</b>');
    
    // 解析斜体
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
    text = text.replace(/_(.*?)_/g, '<i>$1</i>');
    
    // 解析链接
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 解析行内代码
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 解析上标（知乎引用格式）
    text = text.replace(/\[\^(\d+)\]/g, (match, num) => {
      return `<sup data-text="footnote ${num}" data-url="http://footnote.com" data-draft-node="inline" data-draft-type="reference" data-numero="${num}">[${num}]</sup>`;
    });
    
    // 解析图片
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // 处理知乎特殊图片格式
      if (src.startsWith('//www.zhihu.com/equation')) {
        return `<img eeimg="1" src="${src}" alt="${alt}"/>`;
      }
      
      // 处理普通图片
      return `<img src="${src}" alt="${alt}" />`;
    });
    
    // 处理换行
    text = text.replace(/\n/g, '<br/>');

    // 处理数学公式
    text = text.replace(/\$(.*?)\$/g, (match, formula) => {
      return `<img eeimg="1" src="//www.zhihu.com/equation?tex=${encodeURIComponent(formula)}" alt="${formula}"/>`;
    });
    
    return text;
  }
  
  /**
   * 判断是否为列表
   */
  private _isList(block: string): boolean {
    const lines = block.split('\n');
    if (lines.length === 0) return false;
    
    // 检查第一行是否为列表项
    const firstLine = lines[0].trim();
    if (firstLine.match(/^\d+\.\s/) || firstLine.match(/^[-*+]\s/)){
return true
    } else {
return false;
    }
  }
  
  /**
   * 解析列表
   */
  private _parseList(block: string): string {
    const lines = block.split('\n');
    let listType: 'ul' | 'ol' = 'ul';
    let html = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 确定列表类型
      if (i === 0) {
        if (line.match(/^\d+\.\s/)) {
          listType = 'ol';
        } else {
          listType = 'ul';
        }
        html += `<${listType}>`;
      }
      
      // 提取列表项内容
      const content = line.replace(/^\d+\.\s+|^[-*+]\s+/, '');
      html += `<li>${this._parseInline(content)}</li>`;
    }
    
    html += `</${listType}>`;
    return html;
  }
  
  /**
   * 解析引用块
   */
  private _parseBlockquote(block: string): string {
    const lines = block.split('\n');
    let content = '';
    
    for (const line of lines) {
      const text = line.replace(/^>\s?/, '');
      content += text + '\n';
    }
    
    content = content.trim();
    const parsedContent = this._parseInline(content);
    return `<blockquote>${parsedContent}</blockquote>`;
  }
  
  /**
   * 解析代码块
   */
  private _parseCodeBlock(block: string): string {
    // 提取语言和代码内容
    const lines = block.split('\n');
    let lang = '';
    let code = '';
    
    // 检查第一行是否指定了语言
    if (lines[0].match(/^```|^~~~/) && lines[0].length > 3) {
      lang = lines[0].substring(3).trim();
    } else if (lines[0].match(/^```|^~~~/)) {
      lang = 'text';
    }
    
    // 提取代码内容
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].match(/^```|^~~~/)) {
        break;
      }
      code += lines[i] + '\n';
    }
    
    code = code.trim();
    
    // 处理知乎代码块格式
    return `<pre lang="${lang}">${code}</pre>`;
  }
  
  /**
   * 计算代码块的行数
   */
  private _countCodeBlockLines(blocks: string[], startIndex: number): number {
    const block = blocks[startIndex];
    const lines = block.split('\n');
    let count = 0;
    
    // 查找代码块结束标记
    for (let i = startIndex; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const currentLines = currentBlock.split('\n');
      
      for (const line of currentLines) {
        if (line.match(/^```|^~~~/)) {
          count++;
          return count - 1; // 减去开始行
        }
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * 判断是否为表格
   */
  private _isTable(block: string, nextBlock: string): boolean {
    // 检查当前块是否为表头
    const headerLine = block.trim();
    if (!headerLine.includes('|')) return false;
    
    // 检查下一个块是否为分隔线
    if (!nextBlock) return false;
    const separatorLine = nextBlock.trim();
    if (separatorLine.match(/^\|?\s*:?---+:?\s*\|(\s*:?---+:?\s*\|)*\s*$/)) {return true;}

    return false
  }
  
  /**
   * 解析表格
   */
  private _parseTable(header: string, separator: string, body: string): string {
    // 解析表头
    const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
    
    // 解析表格内容
    const bodyLines = body.split('\n');
    let html = '<table data-draft-node="block" data-draft-type="table" data-size="normal"><tbody>';
    
    // 添加表头行
    html += '<tr>';
    for (const cell of headerCells) {
      html += `<th>${this._parseInline(cell)}</th>`;
    }
    html += '</tr>';
    
    // 添加内容行
    for (const line of bodyLines) {
      if (line.trim() === '') continue;
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      html += '<tr>';
      
      for (const cell of cells) {
        html += `<td>${this._parseInline(cell)}</td>`;
      }
      
      html += '</tr>';
    }
    
    html += '</tbody></table>';
    return html;
  }
  
  /**
   * 解析图片
   */
  private _parseImage(line: string): string {
    const match = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (!match) return '';
    
    const alt = match[1];
    let src = match[2];
    
    // 处理知乎特殊图片格式
    if (src.startsWith('//www.zhihu.com/equation')) {
      return `<p> <img eeimg="1" src="${src}" alt="${alt}"/> </p>`;
    }
    
    // 处理普通图片
    return `<img src="${src}" data-caption="" data-size="normal" data-rawwidth="256" data-rawheight="256" data-watermark="watermark" data-original-src="${src}" data-watermark-src="${src}" data-private-watermark-src=""/>`;
  }

  /**
   * 解析图片为base64格式
   */
  private _parseImageToBase64(path: string): string {
    // 这里假设 path 是一个有效的图片路径
    const image = fs.readFileSync(path);
    const base64Image = Buffer.from(image).toString('base64');
    return `data:image/png;base64,${base64Image}`;
  }
  
  /**
   * 解析数学公式
   */
  private _parseMathFormula(line: string): string {
    // 提取公式内容
    const match = line.match(/\$\$(.*)\$\$/);
    if (!match) return this._parseParagraph(line);
    
    const formula = match[1];
    // 转换为知乎公式格式
    return `<p> <img eeimg="1" src="//www.zhihu.com/equation?tex=${encodeURIComponent(formula)}" alt="${formula}"/> </p>`;
  }
}

// 使用示例
export async function convertMarkdownToZhihuHtml(markdown: string): Promise<string> {
  const parser = new ZhihuMarkdownParser();
  return parser.parse(markdown);
}

const MAX_URI_LENGTH = 2000;

interface ObsidianUriResult {
  uri: string;
  truncated: boolean;
  originalLength: number;
}

/**
 * Obsidian Advanced URI を生成
 * @param vaultName Obsidian Vault名
 * @param fileName ファイル名（例: "ideas/2024-01-15.md"）
 * @param content 保存する内容
 * @returns URI情報（truncatedがtrueの場合は文字数制限で切り詰められている）
 */
export const generateObsidianUri = (
  vaultName: string,
  fileName: string,
  content: string
): ObsidianUriResult => {
  const encodedVault = encodeURIComponent(vaultName);
  const encodedFile = encodeURIComponent(fileName);
  const baseUri = `obsidian://advanced-uri?vault=${encodedVault}&filepath=${encodedFile}&mode=new&data=`;
  
  const availableLength = MAX_URI_LENGTH - baseUri.length - 100; // 安全マージン
  const encodedContent = encodeURIComponent(content);
  const originalLength = encodedContent.length;

  if (encodedContent.length <= availableLength) {
    return {
      uri: baseUri + encodedContent,
      truncated: false,
      originalLength,
    };
  }

  // 文字数制限を超える場合は切り詰め
  return {
    uri: baseUri + encodedContent.substring(0, availableLength),
    truncated: true,
    originalLength,
  };
};

/**
 * Obsidian URIを開く
 */
export const openObsidianUri = (uri: string): void => {
  window.open(uri, '_blank');
};

/**
 * Markdownファイルとしてダウンロード（URI制限の代替手段）
 */
export const downloadAsMarkdown = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
};

/**
 * Obsidianが利用可能かどうかをチェック（Advanced URIプラグインの存在確認は不可）
 */
export const isObsidianAvailable = (): boolean => {
  // Obsidianアプリのインストール確認は直接できないが、
  // URIスキームが登録されているかの簡易チェック
  if (typeof window === 'undefined') return false;
  return true; // 実際の確認はURIを開いた時に行われる
};

/**
 * Vault名を環境変数から取得
 */
export const getDefaultVaultName = (): string => {
  if (typeof window === 'undefined') return '';
  return process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_NAME || '';
};

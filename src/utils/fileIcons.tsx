import React from 'react';
import { SvgIconProps } from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  Description as DocIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableIcon,
  Slideshow as SlideIcon,
  Archive as ArchiveIcon,
  TextSnippet as TextIcon,
  Javascript as JsIcon,
  Html as HtmlIcon,
  Css as CssIcon,
  Php as PhpIcon,
  DataObject as JsonIcon,
  IntegrationInstructions as XmlIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
  Window as WindowIcon,
  FontDownload as FontIcon,
  Album as DiscIcon,
} from '@mui/icons-material';

// Helper to extract extension
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

// Icon mapping based on extension
export function getFileIcon(filename: string, mimeType: string | null, props?: SvgIconProps): React.ReactElement {
  const ext = getExtension(filename);
  const { sx, ...otherProps } = props || {};
  const combinedSx = { fontSize: 40, ...sx };

  let Icon = FileIcon;
  let color = 'text.secondary';

  // 1. Check Extension first (more specific)
  switch (ext) {
    // Archives
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'xz':
      Icon = ArchiveIcon; color = '#8b5cf6'; break;
    
    // Images
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
    case 'ico':
    case 'tiff':
      Icon = ImageIcon; color = '#a855f7'; break;
    
    // Video
    case 'mp4':
    case 'mkv':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
    case 'webm':
      Icon = VideoIcon; color = '#ef4444'; break;
    
    // Audio
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
    case 'm4a':
      Icon = AudioIcon; color = '#f97316'; break;
    
    // Documents
    case 'pdf':
      Icon = PdfIcon; color = '#ef4444'; break;
    case 'doc':
    case 'docx':
    case 'rtf':
    case 'odt':
      Icon = DocIcon; color = '#3b82f6'; break;
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'ods':
      Icon = TableIcon; color = '#10b981'; break;
    case 'ppt':
    case 'pptx':
    case 'odp':
      Icon = SlideIcon; color = '#f59e0b'; break;
    case 'txt':
    case 'md':
    case 'log':
      Icon = TextIcon; color = '#64748b'; break;
    
    // Code
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
      Icon = JsIcon; color = '#f7df1e'; break;
    case 'html':
    case 'htm':
      Icon = HtmlIcon; color = '#e34f26'; break;
    case 'css':
    case 'scss':
    case 'less':
      Icon = CssIcon; color = '#264de4'; break;
    case 'json':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'env':
      Icon = JsonIcon; color = '#6366f1'; break;
    case 'xml':
      Icon = XmlIcon; color = '#ef4444'; break;
    case 'php':
      Icon = PhpIcon; color = '#777bb4'; break;
    case 'py':
    case 'rs':
    case 'go':
    case 'java':
    case 'c':
    case 'cpp':
    case 'h':
    case 'rb':
    case 'sh':
    case 'bat':
    case 'ps1':
    case 'cmd':
      Icon = CodeIcon; color = '#6366f1'; break;
    
    // System / Executables
    case 'exe':
    case 'msi':
      Icon = WindowIcon; color = '#00a4ef'; break;
    case 'apk':
      Icon = AndroidIcon; color = '#3ddc84'; break;
    case 'dmg':
    case 'pkg':
      Icon = AppleIcon; color = '#999999'; break;
    case 'iso':
    case 'img':
      Icon = DiscIcon; color = '#9ca3af'; break;
    
    // Fonts
    case 'ttf':
    case 'otf':
    case 'woff':
    case 'woff2':
      Icon = FontIcon; color = '#4b5563'; break;
  }

  // 2. Fallback to Mime Type if Icon is still default
  if (Icon === FileIcon && mimeType) {
    if (mimeType.startsWith('image/')) { Icon = ImageIcon; color = '#a855f7'; }
    else if (mimeType.startsWith('video/')) { Icon = VideoIcon; color = '#ef4444'; }
    else if (mimeType.startsWith('audio/')) { Icon = AudioIcon; color = '#f97316'; }
    else if (mimeType.includes('pdf')) { Icon = PdfIcon; color = '#ef4444'; }
    else if (mimeType.startsWith('text/')) { Icon = TextIcon; color = '#64748b'; }
  }

  return <Icon {...otherProps} sx={{ ...combinedSx, color }} />;
}

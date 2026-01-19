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
  Terminal as TerminalIcon,
  Storage as DatabaseIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Settings as ConfigIcon,
  Book as BookIcon,
  Brush as DesignIcon,
  Movie as MovieIcon,
  MusicNote as MusicIcon,
  Gamepad as GameIcon,
  Memory as BinaryIcon,
  Folder as FolderIcon,
  FolderZip as ZipFolderIcon,
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
    // Archives - Compressed files
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'xz':
    case 'tgz':
    case 'tbz2':
    case 'lz':
    case 'lzma':
    case 'cab':
    case 'arj':
    case 'ace':
    case 'z':
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
    case 'tif':
    case 'psd':
    case 'ai':
    case 'eps':
    case 'raw':
    case 'cr2':
    case 'nef':
    case 'heic':
    case 'heif':
    case 'avif':
    case 'jxl':
      Icon = ImageIcon; color = '#a855f7'; break;

    // Video
    case 'mp4':
    case 'mkv':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
    case 'webm':
    case 'm4v':
    case 'mpg':
    case 'mpeg':
    case '3gp':
    case '3g2':
    case 'ogv':
    case 'ts':
    case 'mts':
    case 'm2ts':
    case 'vob':
    case 'rmvb':
    case 'rm':
    case 'asf':
      Icon = VideoIcon; color = '#ef4444'; break;

    // Audio
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
    case 'm4a':
    case 'wma':
    case 'opus':
    case 'aiff':
    case 'ape':
    case 'alac':
    case 'mid':
    case 'midi':
    case 'mka':
    case 'ac3':
    case 'dts':
      Icon = AudioIcon; color = '#f97316'; break;

    // Documents - PDF
    case 'pdf':
      Icon = PdfIcon; color = '#ef4444'; break;

    // Documents - Word
    case 'doc':
    case 'docx':
    case 'rtf':
    case 'odt':
    case 'wps':
    case 'wpd':
      Icon = DocIcon; color = '#3b82f6'; break;

    // Documents - Spreadsheet
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'ods':
    case 'numbers':
    case 'tsv':
      Icon = TableIcon; color = '#10b981'; break;

    // Documents - Presentation
    case 'ppt':
    case 'pptx':
    case 'odp':
    case 'key':
      Icon = SlideIcon; color = '#f59e0b'; break;

    // Documents - Text
    case 'txt':
    case 'md':
    case 'markdown':
    case 'log':
    case 'nfo':
    case 'readme':
    case 'changelog':
    case 'license':
      Icon = TextIcon; color = '#64748b'; break;

    // Documents - eBook
    case 'epub':
    case 'mobi':
    case 'azw':
    case 'azw3':
    case 'fb2':
    case 'djvu':
    case 'cbr':
    case 'cbz':
      Icon = BookIcon; color = '#8b5cf6'; break;

    // Code - JavaScript/TypeScript
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
    case 'cjs':
    case 'mts':
    case 'cts':
      Icon = JsIcon; color = '#f7df1e'; break;

    // Code - HTML
    case 'html':
    case 'htm':
    case 'xhtml':
    case 'vue':
    case 'svelte':
      Icon = HtmlIcon; color = '#e34f26'; break;

    // Code - CSS
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
    case 'styl':
    case 'stylus':
      Icon = CssIcon; color = '#264de4'; break;

    // Code - Data formats
    case 'json':
    case 'json5':
    case 'jsonc':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'env':
    case 'properties':
    case 'conf':
    case 'cfg':
      Icon = JsonIcon; color = '#6366f1'; break;

    // Code - XML
    case 'xml':
    case 'xsl':
    case 'xslt':
    case 'xsd':
    case 'wsdl':
    case 'plist':
    case 'xaml':
      Icon = XmlIcon; color = '#ef4444'; break;

    // Code - PHP
    case 'php':
    case 'phtml':
    case 'php3':
    case 'php4':
    case 'php5':
    case 'phps':
      Icon = PhpIcon; color = '#777bb4'; break;

    // Code - Python
    case 'py':
    case 'pyw':
    case 'pyx':
    case 'pxd':
    case 'pyi':
    case 'pyc':
    case 'pyo':
    case 'ipynb':
      Icon = CodeIcon; color = '#3776ab'; break;

    // Code - Rust
    case 'rs':
    case 'rlib':
      Icon = CodeIcon; color = '#dea584'; break;

    // Code - Go
    case 'go':
    case 'mod':
    case 'sum':
      Icon = CodeIcon; color = '#00add8'; break;

    // Code - Java/Kotlin
    case 'java':
    case 'jar':
    case 'class':
    case 'kt':
    case 'kts':
    case 'ktm':
      Icon = CodeIcon; color = '#b07219'; break;

    // Code - C/C++
    case 'c':
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
    case 'hxx':
    case 'hh':
      Icon = CodeIcon; color = '#00599c'; break;

    // Code - C#
    case 'cs':
    case 'csx':
      Icon = CodeIcon; color = '#178600'; break;

    // Code - Ruby
    case 'rb':
    case 'rbw':
    case 'rake':
    case 'gemspec':
      Icon = CodeIcon; color = '#cc342d'; break;

    // Code - Swift
    case 'swift':
      Icon = CodeIcon; color = '#f05138'; break;

    // Code - Dart
    case 'dart':
      Icon = CodeIcon; color = '#0175c2'; break;

    // Code - Lua
    case 'lua':
      Icon = CodeIcon; color = '#000080'; break;

    // Code - Perl
    case 'pl':
    case 'pm':
    case 'pod':
      Icon = CodeIcon; color = '#39457e'; break;

    // Code - R
    case 'r':
    case 'rmd':
      Icon = CodeIcon; color = '#276dc3'; break;

    // Code - Scala
    case 'scala':
    case 'sc':
      Icon = CodeIcon; color = '#dc322f'; break;

    // Code - Haskell
    case 'hs':
    case 'lhs':
      Icon = CodeIcon; color = '#5e5086'; break;

    // Code - Elixir/Erlang
    case 'ex':
    case 'exs':
    case 'erl':
    case 'hrl':
      Icon = CodeIcon; color = '#6e4a7e'; break;

    // Code - Clojure
    case 'clj':
    case 'cljs':
    case 'cljc':
    case 'edn':
      Icon = CodeIcon; color = '#5881d8'; break;

    // Code - SQL/Database
    case 'sql':
    case 'sqlite':
    case 'sqlite3':
    case 'db':
    case 'mdb':
    case 'accdb':
      Icon = DatabaseIcon; color = '#336791'; break;

    // Shell/Terminal
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
    case 'ksh':
    case 'csh':
    case 'tcsh':
    case 'bat':
    case 'cmd':
    case 'ps1':
    case 'psm1':
    case 'psd1':
      Icon = TerminalIcon; color = '#4eaa25'; break;

    // System / Executables - Windows
    case 'exe':
    case 'msi':
    case 'dll':
    case 'sys':
    case 'drv':
    case 'ocx':
    case 'scr':
    case 'cpl':
      Icon = WindowIcon; color = '#00a4ef'; break;

    // System / Executables - Android
    case 'apk':
    case 'aab':
    case 'xapk':
      Icon = AndroidIcon; color = '#3ddc84'; break;

    // System / Executables - macOS/iOS
    case 'dmg':
    case 'pkg':
    case 'app':
    case 'ipa':
    case 'deb':
      Icon = AppleIcon; color = '#999999'; break;

    // System / Executables - Linux
    case 'rpm':
    case 'snap':
    case 'flatpak':
    case 'appimage':
      Icon = BinaryIcon; color = '#fcc624'; break;

    // Disk Images
    case 'iso':
    case 'img':
    case 'bin':
    case 'cue':
    case 'nrg':
    case 'mdf':
    case 'mds':
    case 'vhd':
    case 'vhdx':
    case 'vmdk':
    case 'vdi':
    case 'qcow2':
      Icon = DiscIcon; color = '#9ca3af'; break;

    // Fonts
    case 'ttf':
    case 'otf':
    case 'woff':
    case 'woff2':
    case 'eot':
    case 'fon':
    case 'fnt':
      Icon = FontIcon; color = '#4b5563'; break;

    // Security/Keys
    case 'pem':
    case 'crt':
    case 'cer':
    case 'der':
    case 'p12':
    case 'pfx':
    case 'p7b':
    case 'p7c':
      Icon = LockIcon; color = '#059669'; break;

    case 'key':
    case 'pub':
    case 'ppk':
    case 'asc':
    case 'gpg':
    case 'pgp':
      Icon = KeyIcon; color = '#d97706'; break;

    // Design files
    case 'sketch':
    case 'fig':
    case 'xd':
    case 'afdesign':
    case 'afphoto':
      Icon = DesignIcon; color = '#f24e1e'; break;

    // Game files
    case 'unity':
    case 'unitypackage':
    case 'uasset':
    case 'pak':
    case 'wad':
    case 'vpk':
    case 'gcf':
      Icon = GameIcon; color = '#222c37'; break;

    // Torrent
    case 'torrent':
      Icon = FolderIcon; color = '#43a047'; break;

    // Backup files
    case 'bak':
    case 'backup':
    case 'old':
    case 'orig':
      Icon = FileIcon; color = '#78909c'; break;

    // Temporary files
    case 'tmp':
    case 'temp':
    case 'swp':
    case 'swo':
      Icon = FileIcon; color = '#90a4ae'; break;

    // Makefile and build
    case 'makefile':
    case 'cmake':
    case 'gradle':
    case 'maven':
      Icon = ConfigIcon; color = '#6d4c41'; break;

    // Docker
    case 'dockerfile':
      Icon = ConfigIcon; color = '#2496ed'; break;

    // Kubernetes
    case 'k8s':
      Icon = ConfigIcon; color = '#326ce5'; break;
  }

  // 2. Fallback to Mime Type if Icon is still default
  if (Icon === FileIcon && mimeType) {
    if (mimeType.startsWith('image/')) { Icon = ImageIcon; color = '#a855f7'; }
    else if (mimeType.startsWith('video/')) { Icon = VideoIcon; color = '#ef4444'; }
    else if (mimeType.startsWith('audio/')) { Icon = AudioIcon; color = '#f97316'; }
    else if (mimeType.includes('pdf')) { Icon = PdfIcon; color = '#ef4444'; }
    else if (mimeType.startsWith('text/')) { Icon = TextIcon; color = '#64748b'; }
    else if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
      Icon = ArchiveIcon; color = '#8b5cf6';
    }
    else if (mimeType.includes('executable') || mimeType.includes('x-msdownload')) {
      Icon = WindowIcon; color = '#00a4ef';
    }
  }

  return <Icon {...otherProps} sx={{ ...combinedSx, color }} />;
}

// Get color for file extension (useful for badges, etc.)
export function getFileColor(filename: string): string {
  const ext = getExtension(filename);

  const colorMap: Record<string, string> = {
    // Archives
    zip: '#8b5cf6', rar: '#8b5cf6', '7z': '#8b5cf6', tar: '#8b5cf6', gz: '#8b5cf6',
    // Images
    jpg: '#a855f7', jpeg: '#a855f7', png: '#a855f7', gif: '#a855f7', svg: '#a855f7',
    // Video
    mp4: '#ef4444', mkv: '#ef4444', avi: '#ef4444', mov: '#ef4444',
    // Audio
    mp3: '#f97316', wav: '#f97316', flac: '#f97316',
    // Documents
    pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6', xls: '#10b981', xlsx: '#10b981',
    ppt: '#f59e0b', pptx: '#f59e0b', txt: '#64748b',
    // Code
    js: '#f7df1e', ts: '#3178c6', jsx: '#61dafb', tsx: '#3178c6',
    html: '#e34f26', css: '#264de4', json: '#6366f1', py: '#3776ab',
    rs: '#dea584', go: '#00add8', java: '#b07219', c: '#00599c', cpp: '#00599c',
    // Executables
    exe: '#00a4ef', msi: '#00a4ef', apk: '#3ddc84', dmg: '#999999',
  };

  return colorMap[ext] || '#64748b';
}
